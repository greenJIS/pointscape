import { describe, expect, it } from 'vitest';
import { v } from '../core/vec';
import {
  cellSize,
  fit,
  isTap,
  panBy,
  toCell,
  toScreen,
  zoomAt,
  type Camera,
  type Viewport,
} from './camera';

describe('camera', () => {
  const viewport: Viewport = { width: 800, height: 600 };
  const size = 16;

  describe('fit', () => {
    it('fit after a viewport resize keeps the zoom at 1', () => {
      const cam = fit({ width: 1024, height: 768 }, size);
      expect(cam.zoom).toBe(1);
      expect(cam.panX).toBe(0);
      expect(cam.panY).toBe(0);
    });
  });

  describe('cellSize', () => {
    it('computes cell size based on the smaller viewport dimension', () => {
      const cam = fit(viewport, size);
      // Math.min(800 / 16, 600 / 16) = Math.min(50, 37.5) = 37.5
      expect(cellSize(cam, viewport, size)).toBe(37.5);
    });

    it('scales cell size by zoom', () => {
      const cam: Camera = { zoom: 2, panX: 0, panY: 0 };
      expect(cellSize(cam, viewport, size)).toBe(75);
    });
  });

  describe('zoomAt', () => {
    it('zoomAt never goes below 1 or above 8', () => {
      const cam = fit(viewport, size);
      const focus = v(400, 300);

      const zoomedOut = zoomAt(cam, 0.5, focus, viewport, size);
      expect(zoomedOut.zoom).toBe(1);

      const zoomedIn = zoomAt(cam, 10, focus, viewport, size);
      expect(zoomedIn.zoom).toBe(8);

      const superZoomed = zoomAt(zoomedIn, 2, focus, viewport, size);
      expect(superZoomed.zoom).toBe(8);
    });

    it('keeps the cell coordinate under focus stationary', () => {
      const squareViewport: Viewport = { width: 400, height: 400 };
      const cam = fit(squareViewport, size);
      const focus = v(200, 200);

      const cellBefore = toCell(cam, focus, squareViewport, size);
      const zoomed = zoomAt(cam, 2, focus, squareViewport, size);
      const cellAfter = toCell(zoomed, focus, squareViewport, size);

      expect(cellAfter.x).toBeCloseTo(cellBefore.x);
      expect(cellAfter.y).toBeCloseTo(cellBefore.y);
    });
  });

  describe('panBy', () => {
    it('panBy never shows space outside the board', () => {
      // At zoom 1 on an 800x600 viewport with 16x16 board, cellSize is 37.5.
      // boardW = 600 <= 800, boardH = 600 <= 600.
      // maxPanX = 0, maxPanY = 0.
      const cam1 = fit(viewport, size);
      const panned1 = panBy(cam1, 100, 100, viewport, size);
      expect(panned1.panX).toBe(0);
      expect(panned1.panY).toBe(0);

      // At zoom 2 on a 400x400 viewport with 16x16 board:
      // cellSize is 400/16 * 2 = 50. boardW = 800, boardH = 800.
      // maxPanX = (800 - 400) / 2 = 200.
      const squareViewport: Viewport = { width: 400, height: 400 };
      const cam2: Camera = { zoom: 2, panX: 0, panY: 0 };

      const panRight = panBy(cam2, 300, 0, squareViewport, size);
      expect(panRight.panX).toBe(200);

      const panLeft = panBy(cam2, -300, 0, squareViewport, size);
      expect(panLeft.panX).toBe(-200);

      const panUp = panBy(cam2, 0, -500, squareViewport, size);
      expect(panUp.panY).toBe(-200);

      const panDown = panBy(cam2, 0, 500, squareViewport, size);
      expect(panDown.panY).toBe(200);
    });
  });

  describe('toCell and toScreen', () => {
    it('toCell transforms screen coords to fractional cell coords correctly', () => {
      const squareViewport: Viewport = { width: 400, height: 400 };
      const cam = fit(squareViewport, 16);
      // Board origin is (0, 0), cellSize is 25.
      expect(toCell(cam, v(0, 0), squareViewport, 16)).toEqual({ x: 0, y: 0 });
      expect(toCell(cam, v(25, 50), squareViewport, 16)).toEqual({
        x: 1,
        y: 2,
      });
      expect(toCell(cam, v(200, 200), squareViewport, 16)).toEqual({
        x: 8,
        y: 8,
      });
    });

    it('toScreen is inverse of toCell', () => {
      const squareViewport: Viewport = { width: 500, height: 500 };
      const cam: Camera = { zoom: 1.5, panX: 20, panY: -10 };
      const pt = v(123, 234);
      const cell = toCell(cam, pt, squareViewport, 16);
      const screen = toScreen(cam, cell, squareViewport, 16);
      expect(screen.x).toBeCloseTo(pt.x);
      expect(screen.y).toBeCloseTo(pt.y);
    });
  });

  describe('isTap', () => {
    it('isTap is true within 6 px and false past 6 px', () => {
      expect(isTap(v(100, 100), v(100, 100))).toBe(true);
      expect(isTap(v(100, 100), v(104, 104))).toBe(true); // hypot = 5.656 <= 6
      expect(isTap(v(100, 100), v(106, 100))).toBe(true); // hypot = 6.0 <= 6
      expect(isTap(v(100, 100), v(107, 100))).toBe(false); // hypot = 7.0 > 6
      expect(isTap(v(100, 100), v(105, 105))).toBe(false); // hypot = 7.07 > 6
    });
  });
});

describe('camera inset', () => {
  const size = 16;
  const inset = { top: 100, right: 20, bottom: 200, left: 20 };
  const vp: Viewport = { width: 800, height: 900, inset };
  // Inset rect: x 20..780 (760 wide), y 100..700 (600 tall).

  it('fits the board inside the inset rect at zoom 1', () => {
    const cam = fit(vp, size);
    const tl = toScreen(cam, { x: 0, y: 0 }, vp, size);
    const br = toScreen(cam, { x: size, y: size }, vp, size);
    expect(cellSize(cam, vp, size)).toBe(600 / 16);
    expect(tl.y).toBeGreaterThanOrEqual(inset.top);
    expect(br.y).toBeLessThanOrEqual(900 - inset.bottom);
    expect(tl.x).toBeGreaterThanOrEqual(inset.left);
    expect(br.x).toBeLessThanOrEqual(800 - inset.right);
  });

  it('does not pan at the fitted zoom', () => {
    const cam = panBy(fit(vp, size), 50, -50, vp, size);
    expect(cam.panX).toBeCloseTo(0);
    expect(cam.panY).toBeCloseTo(0);
  });

  it('clamps pan so board edges stay at the inset rect when zoomed', () => {
    const zoomed: Camera = { zoom: 2, panX: 0, panY: 0 };
    const far = panBy(zoomed, 9999, 9999, vp, size);
    const tl = toScreen(far, { x: 0, y: 0 }, vp, size);
    expect(tl.x).toBeCloseTo(inset.left);
    expect(tl.y).toBeCloseTo(inset.top);
  });

  it('zoom stays within 1..8 and toCell round-trips toScreen', () => {
    const focus = { x: 400, y: 400 };
    const out = zoomAt(fit(vp, size), 0.1, focus, vp, size);
    expect(out.zoom).toBe(1);
    const big = zoomAt(fit(vp, size), 100, focus, vp, size);
    expect(big.zoom).toBe(8);
    const cell = { x: 3.5, y: 9.25 };
    const back = toCell(big, toScreen(big, cell, vp, size), vp, size);
    expect(back.x).toBeCloseTo(cell.x);
    expect(back.y).toBeCloseTo(cell.y);
  });

  it('zoom keeps the focus cell under the pointer', () => {
    const focus = { x: 300, y: 350 };
    const cam = fit(vp, size);
    const before = toCell(cam, focus, vp, size);
    const next = zoomAt(cam, 3, focus, vp, size);
    const after = toCell(next, focus, vp, size);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});
