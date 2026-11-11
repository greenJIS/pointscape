import { describe, expect, it, vi } from 'vitest';
import type { Arrow, Level } from '../core/types';
import { v } from '../core/vec';
import { fit } from './camera';
import {
  darkenColor,
  draw,
  drawArrows,
  drawHoldPreview,
  drawMaskDots,
  lerpColor,
} from './draw';
import { ANIM } from './motion';
import { THEME_COLORS } from './theme';

function createMockContext() {
  const calls = {
    beginPath: 0,
    stroke: 0,
    fill: 0,
    arc: 0,
    moveTo: 0,
    lineTo: 0,
    closePath: 0,
    fillRect: 0,
    setLineDash: 0,
  };
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(() => calls.fillRect++),
    beginPath: vi.fn(() => calls.beginPath++),
    stroke: vi.fn(() => calls.stroke++),
    fill: vi.fn(() => calls.fill++),
    arc: vi.fn(() => calls.arc++),
    moveTo: vi.fn(() => calls.moveTo++),
    lineTo: vi.fn(() => calls.lineTo++),
    closePath: vi.fn(() => calls.closePath++),
    setLineDash: vi.fn(() => calls.setLineDash++),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

describe('draw', () => {
  const arrow1: Arrow = {
    id: 1,
    cells: [v(1, 1), v(1, 2), v(1, 3)],
    dir: v(0, 1),
  };
  const arrow2: Arrow = {
    id: 2,
    cells: [v(4, 4), v(5, 4)],
    dir: v(1, 0),
  };

  it('drawing a 64x64 level issues a bounded number of path calls', () => {
    const size = 64;
    const level: Level = {
      size,
      mask: new Array<boolean>(size * size).fill(true),
      arrows: [arrow1, arrow2],
    };
    const viewport = { width: 640, height: 640 };
    const cam = fit(viewport, size);
    const { ctx, calls } = createMockContext();

    draw(
      ctx,
      {
        level,
        cam,
        viewport,
        colors: ['#000000', '#ff8a00', '#ffe600'],
        theme: THEME_COLORS.light,
        idleIds: new Set([1, 2]),
        showDots: true,
      },
      0,
    );

    // 4096 dots drawn
    expect(calls.arc).toBe(4096);
    // Path begin/fill calls for dots + 2 arrows must be small and bounded, NOT 4096+
    expect(calls.beginPath).toBeLessThan(30);
    expect(calls.fill).toBeLessThan(30);
    expect(calls.stroke).toBeLessThan(30);
  });

  it('drawMaskDots batches all non-rippling dots into a single beginPath and fill', () => {
    const size = 64;
    const level: Level = {
      size,
      mask: new Array<boolean>(size * size).fill(true),
      arrows: [],
    };
    const viewport = { width: 640, height: 640 };
    const cam = fit(viewport, size);
    const { ctx, calls } = createMockContext();

    drawMaskDots(
      ctx,
      {
        level,
        cam,
        viewport,
        colors: [],
        theme: THEME_COLORS.light,
      },
      0,
    );

    expect(calls.beginPath).toBe(1);
    expect(calls.fill).toBe(1);
    expect(calls.arc).toBe(4096);
    expect(calls.stroke).toBe(0);
  });

  it('drawMaskDots animates win ripple', () => {
    const size = 8;
    const level: Level = {
      size,
      mask: new Array<boolean>(64).fill(true),
      arrows: [],
    };
    const viewport = { width: 400, height: 400 };
    const cam = fit(viewport, size);
    const { ctx, calls } = createMockContext();

    // With win ripple active, ripple wave activates some dots
    drawMaskDots(
      ctx,
      {
        level,
        cam,
        viewport,
        colors: [],
        theme: THEME_COLORS.light,
        winRipple: {
          t0: 0,
          origin: v(0, 0),
        },
      },
      0.1,
    );

    // Base dots batch + rippling dots
    expect(calls.fill).toBeGreaterThan(1);
    expect(calls.arc).toBe(64);
  });

  it('drawArrows respects idleIds and filters out removed arrows', () => {
    const level: Level = {
      size: 8,
      mask: new Array<boolean>(64).fill(true),
      arrows: [arrow1, arrow2],
    };
    const viewport = { width: 400, height: 400 };
    const cam = fit(viewport, 8);
    const { ctx, calls } = createMockContext();

    // idleIds only contains arrow1
    drawArrows(
      ctx,
      {
        level,
        cam,
        viewport,
        colors: ['#000000', '#ff8a00', '#ffe600'],
        theme: THEME_COLORS.dark,
        idleIds: new Set([1]),
      },
      0,
    );

    // With 1 arrow, head has 1 fill + 1 shadow fill = 2 fills
    expect(calls.fill).toBe(2);
  });

  it('drawArrows does not render sliding arrow after finish distance', () => {
    const level: Level = {
      size: 8,
      mask: new Array<boolean>(64).fill(true),
      arrows: [arrow1],
    };
    const viewport = { width: 400, height: 400 };
    const cam = fit(viewport, 8);
    const { ctx, calls } = createMockContext();

    // Arrow 1 is sliding, but 5 seconds have passed (finish distance long exceeded)
    drawArrows(
      ctx,
      {
        level,
        cam,
        viewport,
        colors: ['#000000', '#ff8a00'],
        theme: THEME_COLORS.light,
        idleIds: new Set(),
        slides: new Map([[1, { arrowId: 1, t0: 0, rate: 1 }]]),
      },
      5.0,
    );

    expect(calls.stroke).toBe(0);
    expect(calls.fill).toBe(0);
  });

  it('drawArrows animates bumping, jiggling and flashing arrow', () => {
    const level: Level = {
      size: 8,
      mask: new Array<boolean>(64).fill(true),
      arrows: [arrow1, arrow2],
    };
    const viewport = { width: 400, height: 400 };
    const cam = fit(viewport, 8);
    const { ctx, calls } = createMockContext();

    drawArrows(
      ctx,
      {
        level,
        cam,
        viewport,
        colors: ['#000000', '#ff8a00', '#ffe600'],
        theme: THEME_COLORS.light,
        idleIds: new Set(),
        bumps: new Map([[1, { arrowId: 1, t0: 0, bumpDist: 1.2 }]]),
        flashes: new Map([[1, { arrowId: 1, t0: 0 }]]),
        jiggles: new Map([[2, { arrowId: 2, t0: 0, dir: v(0, 1) }]]),
      },
      ANIM.forward * 0.5,
    );

    // Both arrows are drawn (bump + jiggle)
    expect(calls.fill).toBe(4);
  });

  it('drawArrows animates hint pulse', () => {
    const level: Level = {
      size: 8,
      mask: new Array<boolean>(64).fill(true),
      arrows: [arrow1],
    };
    const viewport = { width: 400, height: 400 };
    const cam = fit(viewport, 8);
    const { ctx, calls } = createMockContext();

    drawArrows(
      ctx,
      {
        level,
        cam,
        viewport,
        colors: ['#000000', '#ff8a00'],
        theme: THEME_COLORS.light,
        idleIds: new Set([1]),
        hintId: 1,
        hintStart: 0,
      },
      ANIM.hintTime * 0.5,
    );

    expect(calls.fill).toBe(2);
  });

  it('drawHoldPreview draws a dashed preview line', () => {
    const level: Level = {
      size: 8,
      mask: new Array<boolean>(64).fill(true),
      arrows: [arrow1],
    };
    const viewport = { width: 400, height: 400 };
    const cam = fit(viewport, 8);
    const { ctx, calls } = createMockContext();

    drawHoldPreview(ctx, {
      level,
      cam,
      viewport,
      colors: ['#000000', '#ff8a00'],
      theme: THEME_COLORS.light,
      holdPreview: {
        arrowId: 1,
        blocked: false,
        reach: 5,
      },
    });

    expect(calls.setLineDash).toBeGreaterThanOrEqual(1);
    expect(calls.stroke).toBe(1);
  });

  it('lerpColor and darkenColor compute correct color values', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(lerpColor('#ff0000', '#00ff00', 0)).toBe('#ff0000');
    expect(lerpColor('#ff0000', '#00ff00', 1)).toBe('#00ff00');
    expect(darkenColor('#ffffff', 0.5)).toBe('#808080');
  });
});
