import { describe, expect, it } from 'vitest';
import type { Arrow, Level } from '../core/types';
import { RIGHT, UP, v } from '../core/vec';
import {
  ANIM,
  arrowPath,
  bumpDistance,
  slideDistance,
  subPath,
} from './motion';

const level: Level = {
  size: 6,
  mask: new Array(6 * 6).fill(true),
  arrows: [],
};

const straight: Arrow = {
  id: 0,
  cells: [v(1, 2), v(2, 2), v(3, 2)],
  dir: RIGHT,
};

const bent: Arrow = {
  id: 1,
  cells: [v(1, 4), v(2, 4), v(2, 3)],
  dir: UP,
};

const length = (pts: readonly { x: number; y: number }[]): number => {
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (a && b) sum += Math.hypot(a.x - b.x, a.y - b.y);
  }
  return sum;
};

describe('motion', () => {
  describe('timing', () => {
    it('slideDistance matches 8*s + 20*s*s', () => {
      // s = t * rate; slideDistance = 8 * s + 0.5 * 40 * s * s = 8*s + 20*s*s
      expect(slideDistance(0)).toBe(0);
      expect(slideDistance(1)).toBe(28); // 8*1 + 20*1 = 28
      expect(slideDistance(0.5)).toBe(9); // 8*0.5 + 20*0.25 = 4 + 5 = 9
      // with custom rate
      expect(slideDistance(0.5, 2)).toBe(28); // s = 1 -> 28
    });

    it('bumpDistance matches blockerCells - 0.8', () => {
      expect(bumpDistance(1)).toBeCloseTo(0.2);
      expect(bumpDistance(4)).toBeCloseTo(3.2);
      expect(bumpDistance(2.5)).toBeCloseTo(1.7);
    });

    it('ANIM constants match the design specification', () => {
      expect(ANIM.speed).toBe(8);
      expect(ANIM.acc).toBe(40);
      expect(ANIM.bumpGap).toBe(0.8);
      expect(ANIM.forward).toBe(0.12);
      expect(ANIM.back).toBe(0.12);
      expect(ANIM.jiggle).toBe(0.22);
      expect(ANIM.jiggleSize).toBe(0.1);
      expect(ANIM.flashFull).toBe(0.25);
      expect(ANIM.flashFade).toBe(0.35);
      expect(ANIM.exitHold).toBe(0.32);
      expect(ANIM.winCard).toBe(0.3);
      expect(ANIM.loseCard).toBe(0.65);
      expect(ANIM.hold).toBe(0.35);
    });
  });

  describe('arrowPath', () => {
    it('returns cell centers and extends far past the board', () => {
      const pts = arrowPath(level, straight);
      // straight arrow has 3 cells: (1,2), (2,2), (3,2).
      // cell centers are (1.5, 2.5), (2.5, 2.5), (3.5, 2.5).
      expect(pts[0]).toEqual({ x: 1.5, y: 2.5 });
      expect(pts[1]).toEqual({ x: 2.5, y: 2.5 });
      expect(pts[2]).toEqual({ x: 3.5, y: 2.5 });

      // Last point is far beyond the 6x6 board along RIGHT (x direction)
      const far = pts[pts.length - 1];
      expect(far).toBeDefined();
      expect(far?.y).toBe(2.5);
      expect(far?.x).toBeGreaterThan(6);
    });
  });

  describe('subPath', () => {
    const pts = arrowPath(level, bent);

    it('subPath keeps the body length along a bend', () => {
      // Body length of bent arrow is 2 cells (3 cells: 2 segments).
      const full = subPath(pts, 0, 2);
      expect(length(full)).toBeCloseTo(2);

      // Slide halfway along the bend
      const shifted = subPath(pts, 0.5, 2.5);
      expect(length(shifted)).toBeCloseTo(2);

      // Slide further along
      const shifted2 = subPath(pts, 1.5, 3.5);
      expect(length(shifted2)).toBeCloseTo(2);
    });

    it('clamps to the path ends', () => {
      const clamped = subPath(pts, -5, 1);
      expect(length(clamped)).toBeCloseTo(1);
    });
  });
});
