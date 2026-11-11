import { describe, expect, it } from 'vitest';
import { blockedShare, emptyShare, meanLength } from './quality';
import type { Arrow, Level } from './types';
import { v } from './vec';

describe('quality metrics', () => {
  it('computes emptyShare correctly', () => {
    // 4 cells in mask, 1 arrow of length 3 -> 1 empty cell -> 1/4 = 0.25
    const mask = [true, true, true, true];
    const arrows: Arrow[] = [
      {
        id: 0,
        cells: [v(0, 0), v(1, 0), v(1, 1)],
        dir: v(0, 1),
      },
    ];
    const level: Level = { size: 2, mask, arrows };
    expect(emptyShare(level)).toBeCloseTo(0.25);
  });

  it('computes emptyShare as 0 when mask has 0 cells', () => {
    const level: Level = {
      size: 2,
      mask: [false, false, false, false],
      arrows: [],
    };
    expect(emptyShare(level)).toBe(0);
  });

  it('computes blockedShare correctly', () => {
    // Two arrows on a 4x4 board:
    // Arrow 0: head at (1, 1), dir UP (0, -1). Ray goes to (1, 0).
    // Arrow 1: body at (1, 0) and (2, 0), dir RIGHT.
    // Arrow 0 is blocked by Arrow 1. Arrow 1 has exit ray to (3, 0) which is free.
    // Blocked share: 1 of 2 = 0.5.
    const mask = new Array(16).fill(true);
    const arrow0: Arrow = {
      id: 0,
      cells: [v(1, 2), v(1, 1)],
      dir: v(0, -1),
    };
    const arrow1: Arrow = {
      id: 1,
      cells: [v(1, 0), v(2, 0)],
      dir: v(1, 0),
    };
    const level: Level = { size: 4, mask, arrows: [arrow0, arrow1] };
    expect(blockedShare(level)).toBeCloseTo(0.5);
  });

  it('computes meanLength correctly', () => {
    const mask = new Array(16).fill(true);
    const arrow0: Arrow = {
      id: 0,
      cells: [v(0, 0), v(1, 0)],
      dir: v(1, 0),
    };
    const arrow1: Arrow = {
      id: 1,
      cells: [v(0, 1), v(1, 1), v(2, 1), v(3, 1)],
      dir: v(1, 0),
    };
    const level: Level = { size: 4, mask, arrows: [arrow0, arrow1] };
    // (2 + 4) / 2 = 3
    expect(meanLength(level)).toBe(3);
  });
});
