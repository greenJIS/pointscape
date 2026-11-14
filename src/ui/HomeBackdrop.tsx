import { useEffect, useRef } from 'react';
import { buildLevel } from '../core/levels';
import { solve } from '../core/solver';
import type { Level } from '../core/types';
import { draw, type ActiveSlide } from '../view/draw';
import { finishDistance, slideDistance } from '../view/motion';
import { arrowColors } from '../view/palette';
import { THEME_COLORS } from '../view/theme';

interface Props {
  readonly dark?: boolean;
  readonly onReady?: () => void;
}

/** Size index and level of the board behind the menus: a plain square 32x32 board, so dots fill behind the text. */
const BACKDROP_SIZE = 2;
const BACKDROP_LEVEL = 4;
/** Seconds between one arrow leaving and the next, in solve order. */
const GAP = 0.22;
/** Seconds the cleared board rests before it fills again, and the fade-in time. */
const REST = 1.4;
const FADE = 0.7;

/**
 * The real board renderer drawn behind Home and Name, so the arrows look exactly like the game's. They leave in
 * solve order, then the board fills again. It stands still when the player prefers reduced motion.
 */
export function HomeBackdrop({ dark = false, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The backdrop is see-through, so the page colour shows between the dots.
    const theme = {
      ...THEME_COLORS[dark ? 'dark' : 'light'],
      board: 'rgba(0,0,0,0)',
    };
    let base: Level | null = null;
    let level: Level | null = null;
    let order: readonly number[] = [];
    let colors: string[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let started = 0;
    let cycle = 1;
    let cancelled = false;

    /**
     * Keeps only the whole cells on screen and the arrows that fit inside them, so no arrow head is cut by the
     * screen edge. Then works out the order they leave in and how long the cycle takes.
     */
    const crop = () => {
      if (!base) return;
      const size = base.size;
      const cell = Math.max(width, height) / size;
      const halfCols = width / cell / 2;
      const halfRows = height / cell / 2;
      const x0 = Math.ceil(size / 2 - halfCols);
      const x1 = Math.floor(size / 2 + halfCols);
      const y0 = Math.ceil(size / 2 - halfRows);
      const y1 = Math.floor(size / 2 + halfRows);
      const inside = (x: number, y: number) =>
        x >= x0 && x < x1 && y >= y0 && y < y1;
      const cropped: Level = {
        size,
        mask: base.mask.map(
          (on, i) => on && inside(i % size, Math.floor(i / size)),
        ),
        arrows: base.arrows.filter((a) =>
          a.cells.every((c) => inside(c.x, c.y)),
        ),
      };
      level = cropped;
      order = solve(cropped) ?? [];
      // Time for the slowest arrow to leave at the default speed.
      const longest = Math.max(
        0,
        ...cropped.arrows.map((a) => finishDistance(cropped, a)),
      );
      let exitTime = 0;
      while (slideDistance(exitTime) < longest && exitTime < 20)
        exitTime += 0.05;
      cycle = FADE + order.length * GAP + exitTime + REST;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      crop();
    };

    const frame = (nowMs: number) => {
      raf = 0;
      if (!level || cancelled) return;
      const now = nowMs / 1000;
      if (started === 0) started = now;
      const t = (now - started) % cycle;
      const cycleStart = now - t;

      const slides = new Map<number, ActiveSlide>();
      const idle = new Set<number>();
      order.forEach((id, i) => {
        const at = FADE + i * GAP;
        if (still || t < at) idle.add(id);
        else slides.set(id, { arrowId: id, t0: cycleStart + at });
      });

      const side = Math.min(width, height);
      // Zoom so the board covers the whole screen, as a poster behind the menus.
      const zoom = Math.max(width, height) / side;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = still ? 1 : Math.min(1, t / FADE);
      draw(
        ctx,
        {
          level,
          cam: { zoom, panX: 0, panY: 0 },
          viewport: { width, height },
          colors,
          theme,
          idleIds: idle,
          slides,
        },
        now,
      );
      ctx.globalAlpha = 1;
      if (!still && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (!raf && level && !cancelled) raf = requestAnimationFrame(frame);
    };
    const onVisible = () => {
      if (!document.hidden && !still) start();
    };

    // Let the page paint first: building the level takes a few milliseconds.
    const build = window.setTimeout(() => {
      base = buildLevel(BACKDROP_SIZE, BACKDROP_LEVEL);
      colors = arrowColors(base);
      resize();
      start();
      readyRef.current?.();
    }, 0);

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      start();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(build);
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [dark]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <canvas ref={canvasRef} className="size-full opacity-80" />
    </div>
  );
}
