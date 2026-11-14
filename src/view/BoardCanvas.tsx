import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { blockerOf, exitRay, headOf, occupancy } from '../core/board';
import type { Level, Vec } from '../core/types';
import { key } from '../core/vec';
import type { ThemeMode } from '../game/settings';
import type { Camera, Insets, Viewport } from './camera';
import { areaOf, cellSize, fit, panBy, toCell, zoomAt } from './camera';
import type {
  ActiveBump,
  ActiveFlash,
  ActiveJiggle,
  ActiveSlide,
  HoldPreview,
  WinRipple,
} from './draw';
import { draw } from './draw';
import { ANIM, bumpDistance, finishDistance, slideDistance } from './motion';
import { pickArrow } from './pick';
import { THEME_COLORS } from './theme';

export interface BoardCanvasProps {
  readonly level: Level;
  readonly idleIds: ReadonlySet<number>;
  readonly colors: readonly string[];
  readonly theme: ThemeMode;
  readonly showDots?: boolean;
  readonly speedRate?: number;
  readonly hintId?: number | null;
  readonly isWon?: boolean;
  /** Padding in px the fitted board stays out of, for the HUD rows. */
  readonly inset?: Insets;
  readonly onTap: (arrowId: number) => void;
  readonly onBlocked?: (arrowId: number, blockerId: number) => void;
  readonly ref?: React.Ref<BoardCanvasHandle>;
}

export interface BoardCanvasHandle {
  resetView(): void;
  revealArrow(id: number): void;
}

interface PointerInfo {
  x: number;
  y: number;
  startX: number;
  startY: number;
}

/** Fixed padding in pixels between the box edge and the board, at every zoom. */
const BOX_PAD = 6;

const NO_INSET: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
/** Seconds the reset-view button takes to ease back, as in the 3D game. */
const VIEW_RESET_TIME = 0.5;

export function BoardCanvas({
  level,
  idleIds,
  colors,
  theme,
  showDots = false,
  speedRate = 1,
  hintId = null,
  isWon = false,
  inset = NO_INSET,
  onTap,
  onBlocked,
  ref,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const camRef = useRef<Camera>(fit());
  const camTweenRef = useRef<{
    t0: number;
    from: Camera;
    to: Camera;
    last: Camera;
  } | null>(null);
  const viewportRef = useRef<Viewport>({
    width: 0,
    height: 0,
    square: true,
  });
  const insetRef = useRef<Insets>(inset);

  // Read from the mode itself: the CSS variables only flip after this render.
  const themeColors = THEME_COLORS[theme];

  const slidesRef = useRef<Map<number, ActiveSlide>>(new Map());
  const bumpsRef = useRef<Map<number, ActiveBump>>(new Map());
  const jigglesRef = useRef<Map<number, ActiveJiggle>>(new Map());
  const flashesRef = useRef<Map<number, ActiveFlash>>(new Map());
  const holdPreviewRef = useRef<HoldPreview | null>(null);
  const winRippleRef = useRef<WinRipple | null>(null);
  const hintStartRef = useRef<number>(0);
  const lastClearedHeadRef = useRef<Vec | null>(null);

  const rafIdRef = useRef<number | null>(null);

  const pointersRef = useRef<Map<number, PointerInfo>>(new Map());
  const movedRef = useRef<boolean>(false);
  const previewingRef = useRef<boolean>(false);
  const holdTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const pinchDistRef = useRef<number>(0);

  const renderFrameRef = useRef<(nowMs: number) => void>(() => {});

  const requestRedraw = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame((nowMs) => {
      renderFrameRef.current(nowMs);
    });
  }, []);

  /** True when a canvas point is inside the fixed box; arrows outside it are clipped away. */
  const inBox = (pt: Vec): boolean => {
    const a = areaOf(viewportRef.current);
    return (
      pt.x >= a.left &&
      pt.x <= a.left + a.width &&
      pt.y >= a.top &&
      pt.y <= a.top + a.height
    );
  };

  /** Eases the camera toward its tween target, as the 3D game eases its view reset. */
  const stepCamTween = useCallback((now: number): void => {
    const tw = camTweenRef.current;
    if (!tw) return;
    // A drag, pinch or wheel changed the camera: the player has taken over.
    if (camRef.current !== tw.last) {
      camTweenRef.current = null;
      return;
    }
    const k = Math.min(1, (now - tw.t0) / VIEW_RESET_TIME);
    const e = 1 - Math.pow(1 - k, 3);
    const cam: Camera = {
      zoom: tw.from.zoom + (tw.to.zoom - tw.from.zoom) * e,
      panX: tw.from.panX + (tw.to.panX - tw.from.panX) * e,
      panY: tw.from.panY + (tw.to.panY - tw.from.panY) * e,
    };
    camRef.current = k >= 1 ? tw.to : cam;
    tw.last = camRef.current;
    if (k >= 1) camTweenRef.current = null;
  }, []);

  /** Moves the camera to the fitted view, easing unless the player prefers reduced motion. */
  const animateToFit = useCallback((): void => {
    const to = fit(viewportRef.current, level.size);
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = camRef.current;
    if (
      still ||
      (from.zoom === to.zoom && from.panX === to.panX && from.panY === to.panY)
    ) {
      camTweenRef.current = null;
      camRef.current = to;
    } else {
      camTweenRef.current = {
        t0: performance.now() / 1000,
        from,
        to,
        last: from,
      };
    }
    requestRedraw();
  }, [level.size, requestRedraw]);

  const renderFrame = useCallback(
    (nowMs: number) => {
      rafIdRef.current = null;
      stepCamTween(nowMs / 1000);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = nowMs / 1000;
      const vp = viewportRef.current;
      if (vp.width <= 0 || vp.height <= 0) return;

      // Clean up finished animations
      for (const [id, s] of slidesRef.current.entries()) {
        const arrow = level.arrows.find((a) => a.id === id);
        if (!arrow) {
          slidesRef.current.delete(id);
          continue;
        }
        const dist = slideDistance(now - s.t0, s.rate ?? 1);
        if (dist >= finishDistance(level, arrow)) {
          slidesRef.current.delete(id);
        }
      }
      for (const [id, b] of bumpsRef.current.entries()) {
        if (now - b.t0 >= ANIM.forward + ANIM.back) {
          bumpsRef.current.delete(id);
        }
      }
      for (const [id, j] of jigglesRef.current.entries()) {
        if (now - j.t0 >= ANIM.jiggle) {
          jigglesRef.current.delete(id);
        }
      }
      for (const [id, f] of flashesRef.current.entries()) {
        if (now - f.t0 >= ANIM.flashFull + ANIM.flashFade) {
          flashesRef.current.delete(id);
        }
      }
      if (winRippleRef.current) {
        const maxRipple = level.size * 2 * 0.035 + 0.55;
        if (now - winRippleRef.current.t0 >= maxRipple) {
          winRippleRef.current = null;
        }
      }

      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // The camera works in the inset rect; draw it there, over a full-canvas fill.
      const area = areaOf(vp);
      ctx.clearRect(0, 0, vp.width, vp.height);
      ctx.save();
      ctx.translate(area.left, area.top);
      draw(
        ctx,
        {
          level,
          cam: camRef.current,
          viewport: { width: area.width, height: area.height, pad: vp.pad },
          colors,
          theme: themeColors,
          idleIds,
          showDots,
          frame: true,
          hintId,
          hintStart: hintStartRef.current,
          slides: slidesRef.current,
          bumps: bumpsRef.current,
          jiggles: jigglesRef.current,
          flashes: flashesRef.current,
          holdPreview: holdPreviewRef.current,
          winRipple: winRippleRef.current,
        },
        now,
      );
      ctx.restore();

      const hasAnimations =
        slidesRef.current.size > 0 ||
        bumpsRef.current.size > 0 ||
        jigglesRef.current.size > 0 ||
        flashesRef.current.size > 0 ||
        winRippleRef.current !== null ||
        camTweenRef.current !== null ||
        hintId != null;

      if (hasAnimations) {
        rafIdRef.current = requestAnimationFrame((nextMs) => {
          renderFrameRef.current(nextMs);
        });
      }
    },
    [level, colors, themeColors, idleIds, showDots, hintId, stepCamTween],
  );

  useEffect(() => {
    renderFrameRef.current = renderFrame;
  }, [renderFrame]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        // Clear it, or a remount (React StrictMode in dev) would see a frame
        // as pending forever and never draw again.
        rafIdRef.current = null;
      }
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      resetView() {
        animateToFit();
      },
      revealArrow(id: number) {
        const arrow = level.arrows.find((a) => a.id === id);
        if (!arrow || arrow.cells.length === 0) return;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const c of arrow.cells) {
          if (c.x < minX) minX = c.x;
          if (c.x > maxX) maxX = c.x;
          if (c.y < minY) minY = c.y;
          if (c.y > maxY) maxY = c.y;
        }
        const centerCell = {
          x: (minX + maxX) / 2 + 0.5,
          y: (minY + maxY) / 2 + 0.5,
        };
        const vp = viewportRef.current;
        const cSize = cellSize(camRef.current, vp, level.size);
        const boardW = level.size * cSize;
        const boardH = level.size * cSize;
        const area = areaOf(vp);
        const maxPanX = Math.max(0, (boardW - area.width) / 2);
        const maxPanY = Math.max(0, (boardH - area.height) / 2);
        const targetPanX = Math.max(
          -maxPanX,
          Math.min(maxPanX, boardW / 2 - centerCell.x * cSize),
        );
        const targetPanY = Math.max(
          -maxPanY,
          Math.min(maxPanY, boardH / 2 - centerCell.y * cSize),
        );
        camRef.current = {
          zoom: camRef.current.zoom,
          panX: targetPanX,
          panY: targetPanY,
        };
        requestRedraw();
      },
    }),
    [level, animateToFit, requestRedraw],
  );

  // ResizeObserver & devicePixelRatio
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const dpr =
        typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

      viewportRef.current = {
        width,
        height,
        inset: insetRef.current,
        square: true,
        pad: BOX_PAD,
      };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const cam = camRef.current;
      camRef.current = panBy(cam, 0, 0, viewportRef.current, level.size);
      requestRedraw();
    };

    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);
    updateSize();

    // A pixel-ratio change (browser zoom, moving between screens) can leave the size alone.
    let media: MediaQueryList | null = null;
    const watchRatio = () => {
      media?.removeEventListener('change', onRatio);
      media = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      media.addEventListener('change', onRatio);
    };
    const onRatio = () => {
      updateSize();
      watchRatio();
    };
    watchRatio();

    return () => {
      observer.disconnect();
      media?.removeEventListener('change', onRatio);
    };
  }, [level.size, requestRedraw]);

  // The HUD moved (breakpoint, coach card): refit inside the new rect.
  useEffect(() => {
    const next = {
      top: inset.top,
      right: inset.right,
      bottom: inset.bottom,
      left: inset.left,
    };
    insetRef.current = next;
    const cur = viewportRef.current;
    viewportRef.current = {
      ...cur,
      inset: next,
      pad: BOX_PAD,
    };
    camRef.current = panBy(
      camRef.current,
      0,
      0,
      viewportRef.current,
      level.size,
    );
    requestRedraw();
  }, [
    inset.top,
    inset.right,
    inset.bottom,
    inset.left,
    level.size,
    requestRedraw,
  ]);

  // Level reset
  useEffect(() => {
    camRef.current = fit(viewportRef.current, level.size);
    slidesRef.current.clear();
    bumpsRef.current.clear();
    jigglesRef.current.clear();
    flashesRef.current.clear();
    holdPreviewRef.current = null;
    winRippleRef.current = null;
    requestRedraw();
  }, [level, requestRedraw]);

  // Hint activation
  useEffect(() => {
    if (hintId != null) {
      hintStartRef.current = performance.now() / 1000;
    }
    requestRedraw();
  }, [hintId, requestRedraw]);

  // Win activation
  useEffect(() => {
    if (isWon && !winRippleRef.current) {
      winRippleRef.current = {
        t0: performance.now() / 1000,
        origin: lastClearedHeadRef.current ?? null,
      };
      requestRedraw();
    } else if (!isWon) {
      winRippleRef.current = null;
    }
  }, [isWon, requestRedraw]);

  // External changes to idleIds (e.g. solver or external clearance)
  const prevIdleIdsRef = useRef<ReadonlySet<number>>(idleIds);
  useEffect(() => {
    const prev = prevIdleIdsRef.current;
    prevIdleIdsRef.current = idleIds;
    const now = performance.now() / 1000;
    for (const id of prev) {
      if (!idleIds.has(id) && !slidesRef.current.has(id)) {
        slidesRef.current.set(id, { arrowId: id, t0: now, rate: speedRate });
      }
    }
    requestRedraw();
  }, [idleIds, speedRate, requestRedraw]);

  // Redraw when colors or theme or showDots change
  useEffect(() => {
    requestRedraw();
  }, [colors, themeColors, showDots, requestRedraw]);

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const handleTap = useCallback(
    (arrowId: number) => {
      if (slidesRef.current.has(arrowId) || bumpsRef.current.has(arrowId)) {
        return;
      }
      const arrow = level.arrows.find((a) => a.id === arrowId);
      if (!arrow) return;

      const alive = level.arrows.filter((a) => idleIds.has(a.id));
      const occ = occupancy(alive);
      const blocker = blockerOf(level, arrow, occ);
      const now = performance.now() / 1000;

      if (!blocker) {
        slidesRef.current.set(arrowId, { arrowId, t0: now, rate: speedRate });
        const head = headOf(arrow);
        lastClearedHeadRef.current = { x: head.x, y: head.y };
        onTap(arrowId);
        requestRedraw();
      } else {
        const ray = exitRay(level, arrow);
        let cells = 1;
        for (let i = 0; i < ray.length; i++) {
          const c = ray[i];
          if (c && occ.has(key(c))) {
            cells = i + 1;
            break;
          }
        }
        const bumpDist = bumpDistance(cells);
        bumpsRef.current.set(arrowId, { arrowId, t0: now, bumpDist });
        flashesRef.current.set(arrowId, { arrowId, t0: now });
        jigglesRef.current.set(blocker.id, {
          arrowId: blocker.id,
          t0: now + ANIM.forward,
          dir: arrow.dir,
        });
        onBlocked?.(arrowId, blocker.id);
        onTap(arrowId);
        requestRedraw();
      }
    },
    [level, idleIds, speedRate, onTap, onBlocked, requestRedraw],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
    });

    if (pointersRef.current.size === 1) {
      movedRef.current = false;
      previewingRef.current = false;
      clearHoldTimer();

      const pointerId = e.pointerId;
      holdTimerRef.current = window.setTimeout(() => {
        if (pointersRef.current.size !== 1) return;
        const p = pointersRef.current.get(pointerId);
        const canvas = canvasRef.current;
        if (!p || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const pt = { x: p.x - rect.left, y: p.y - rect.top };
        const cell = toCell(
          camRef.current,
          pt,
          viewportRef.current,
          level.size,
        );
        const cSize = cellSize(camRef.current, viewportRef.current, level.size);
        const id = inBox(pt)
          ? pickArrow(level, idleIds, cell, cSize)
          : undefined;
        if (id !== undefined) {
          const arrow = level.arrows.find((a) => a.id === id);
          if (arrow) {
            previewingRef.current = true;
            const alive = level.arrows.filter((a) => idleIds.has(a.id));
            const occ = occupancy(alive);
            const blocker = blockerOf(level, arrow, occ);
            const ray = exitRay(level, arrow);
            let reach = ray.length + 1;
            if (blocker) {
              const idx = ray.findIndex((c) => occ.has(key(c)));
              reach = idx >= 0 ? idx + 1 : 1;
            }
            holdPreviewRef.current = {
              arrowId: id,
              blocked: blocker !== undefined,
              reach,
            };
            requestRedraw();
          }
        }
      }, ANIM.hold * 1000);
    } else if (pointersRef.current.size === 2) {
      clearHoldTimer();
      previewingRef.current = false;
      holdPreviewRef.current = null;
      movedRef.current = true;
      requestRedraw();

      const pts = Array.from(pointersRef.current.values());
      const p0 = pts[0];
      const p1 = pts[1];
      if (p0 && p1) {
        pinchDistRef.current = Math.hypot(p1.x - p0.x, p1.y - p0.y);
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointersRef.current.get(e.pointerId);
    if (!p) return;

    const prevX = p.x;
    const prevY = p.y;
    p.x = e.clientX;
    p.y = e.clientY;

    if (Math.hypot(p.x - p.startX, p.y - p.startY) > 6) {
      clearHoldTimer();
      if (!previewingRef.current) {
        movedRef.current = true;
      }
    }

    if (previewingRef.current) return;

    if (pointersRef.current.size === 1 && movedRef.current) {
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      camRef.current = panBy(
        camRef.current,
        dx,
        dy,
        viewportRef.current,
        level.size,
      );
      requestRedraw();
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const p0 = pts[0];
      const p1 = pts[1];
      if (p0 && p1 && pinchDistRef.current > 0) {
        const newDist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
        const factor = newDist / pinchDistRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const mid = {
            x: (p0.x + p1.x) / 2 - rect.left,
            y: (p0.y + p1.y) / 2 - rect.top,
          };
          camRef.current = zoomAt(
            camRef.current,
            factor,
            mid,
            viewportRef.current,
            level.size,
          );
          pinchDistRef.current = newDist;
          requestRedraw();
        }
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    clearHoldTimer();
    const p = pointersRef.current.get(e.pointerId);
    pointersRef.current.delete(e.pointerId);

    if (pointersRef.current.size < 2) {
      pinchDistRef.current = 0;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    if (previewingRef.current) {
      previewingRef.current = false;
      holdPreviewRef.current = null;
      requestRedraw();
      return;
    }

    if (!movedRef.current && p) {
      const now = performance.now();
      const last = lastTapRef.current;
      const canvas = canvasRef.current;
      let arrowId: number | undefined;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const pt = { x: p.x - rect.left, y: p.y - rect.top };
        const cell = toCell(
          camRef.current,
          pt,
          viewportRef.current,
          level.size,
        );
        const cSize = cellSize(camRef.current, viewportRef.current, level.size);
        arrowId = inBox(pt)
          ? pickArrow(level, idleIds, cell, cSize)
          : undefined;
      }
      // Double tap on empty space refits the view. On an arrow it is two taps.
      if (
        arrowId === undefined &&
        last &&
        now - last.time < 300 &&
        Math.hypot(p.x - last.x, p.y - last.y) < 20
      ) {
        lastTapRef.current = null;
        animateToFit();
        return;
      }

      lastTapRef.current = { x: p.x, y: p.y, time: now };
      if (arrowId !== undefined) {
        handleTap(arrowId);
      }
    }
    if (pointersRef.current.size === 0) {
      movedRef.current = false;
    }
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    clearHoldTimer();
    previewingRef.current = false;
    holdPreviewRef.current = null;
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchDistRef.current = 0;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    requestRedraw();
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const focus = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const factor = Math.exp(-e.deltaY * 0.002);
    camRef.current = zoomAt(
      camRef.current,
      factor,
      focus,
      viewportRef.current,
      level.size,
    );
    requestRedraw();
  };

  return (
    <canvas
      ref={canvasRef}
      className="size-full touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onWheel={onWheel}
    />
  );
}
