import { useEffect, useRef } from 'react';
import { draw, type ActiveSlide, type HoldPreview } from '../view/draw';
import { finishDistance, slideDistance } from '../view/motion';
import { THEME_COLORS } from '../view/theme';
import { useDark, type MiniScene } from './miniScene';

/** Seconds between one arrow leaving and the next, how long the empty board rests, and the fade back in. */
const GAP = 0.45;
const REST = 0.9;
const FADE = 0.5;

const NO_ORDER: readonly number[] = [];

interface Props {
  readonly scene: MiniScene;
  /** Arrow ids in the order they leave. Needed only when `loop` is on. */
  readonly order?: readonly number[];
  /** Slide the arrows away and bring them back, unless the player prefers reduced motion. */
  readonly loop?: boolean;
  readonly preview?: HoldPreview | null;
  readonly className?: string;
}

/**
 * A small board drawn by the same renderer as the game, so the arrows look exactly like the real ones.
 * The picture takes the board colour of the current theme.
 */
export function MiniBoard({
  scene,
  order = NO_ORDER,
  loop = false,
  preview = null,
  className = '',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dark = useDark();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { level, colors, cols, rows } = scene;
    const theme = THEME_COLORS[dark ? 'dark' : 'light'];
    const still =
      !loop || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // The board is square and the picture is a strip of it, so zoom until the strip fills the canvas.
    const zoom = Math.max(cols, rows) / Math.min(cols, rows);
    let longest = 0;
    for (const a of level.arrows)
      longest = Math.max(longest, finishDistance(level, a));
    let exitTime = 0;
    while (slideDistance(exitTime) < longest && exitTime < 20) exitTime += 0.05;
    const cycle = FADE + order.length * GAP + exitTime + REST;

    let width = 0;
    let height = 0;
    let raf = 0;
    let started = 0;

    const paint = (nowMs: number) => {
      raf = 0;
      const now = nowMs / 1000;
      if (started === 0) started = now;
      const t = still ? 0 : (now - started) % cycle;
      const cycleStart = now - t;
      const slides = new Map<number, ActiveSlide>();
      const idle = new Set<number>();
      order.forEach((id, i) => {
        const at = FADE + i * GAP;
        if (still || t < at) idle.add(id);
        else slides.set(id, { arrowId: id, t0: cycleStart + at });
      });
      for (const a of level.arrows) {
        if (!order.includes(a.id)) idle.add(a.id);
      }
      ctx.globalAlpha = still ? 1 : Math.min(1, 0.25 + t / FADE);
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
          holdPreview: preview,
        },
        now,
      );
      ctx.globalAlpha = 1;
      if (!still && !document.hidden) raf = requestAnimationFrame(paint);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      start();
    };
    const onVisible = () => {
      if (!document.hidden && !still) start();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [scene, order, loop, preview, dark]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block w-full ${className}`}
      style={{ aspectRatio: `${scene.cols} / ${scene.rows}` }}
    />
  );
}
