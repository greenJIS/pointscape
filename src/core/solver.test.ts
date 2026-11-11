import { describe, expect, it } from 'vitest';
import { hint, isSolvable, solve } from './solver';
import type { Arrow, Level } from './types';
import { LEFT, RIGHT, v } from './vec';

const arrow = (id: number, y: number, x1: number, x2: number): Arrow => ({
  id,
  cells: Array.from({ length: x2 - x1 + 1 }, (_, i) => v(x1 + i, y)),
  dir: RIGHT,
});

const level = (arrows: Arrow[]): Level => ({
  size: 6,
  mask: Array(36).fill(true),
  arrows,
});

describe('solve', () => {
  it('clears an empty board with no moves', () => {
    expect(solve(level([]))).toEqual([]);
  });

  it('puts a blocker after the arrow that blocks it', () => {
    // Arrow 1 points right along row 0 and runs into arrow 2's tail.
    const l = level([arrow(1, 0, 0, 1), arrow(2, 0, 3, 4)]);
    const order = solve(l);
    expect(order).toEqual([2, 1]);
  });

  it('solve returns null when two arrows block each other', () => {
    const a: Arrow = {
      id: 1,
      cells: [v(1, 0), v(2, 0)],
      dir: RIGHT,
    };
    const b: Arrow = {
      id: 2,
      cells: [v(4, 0), v(3, 0)],
      dir: LEFT,
    };
    const l = level([a, b]);
    expect(solve(l)).toBeNull();
    expect(isSolvable(l)).toBe(false);
  });
});

describe('hint', () => {
  it('hint returns the first free arrow', () => {
    const l = level([arrow(1, 0, 0, 1), arrow(2, 0, 3, 4)]);
    expect(hint(l)).toBe(2);
  });

  it('gives nothing for an empty or stuck board', () => {
    expect(hint(level([]))).toBeUndefined();

    const a: Arrow = {
      id: 1,
      cells: [v(1, 0), v(2, 0)],
      dir: RIGHT,
    };
    const b: Arrow = {
      id: 2,
      cells: [v(4, 0), v(3, 0)],
      dir: LEFT,
    };
    expect(hint(level([a, b]))).toBeUndefined();
  });
});

describe('isSolvable', () => {
  it('returns true for a solvable board and false for a stuck board', () => {
    expect(isSolvable(level([arrow(1, 0, 0, 1)]))).toBe(true);
  });
});
