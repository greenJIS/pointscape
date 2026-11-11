import { describe, expect, it } from 'vitest';
import type { Arrow, Level } from '../core/types';
import { RIGHT, v } from '../core/vec';
import { pickArrow } from './pick';

describe('pickArrow', () => {
  const arrow0: Arrow = {
    id: 0,
    cells: [v(2, 2), v(3, 2), v(4, 2)],
    dir: RIGHT,
  };
  const arrow1: Arrow = {
    id: 1,
    cells: [v(2, 5), v(3, 5), v(4, 5)],
    dir: RIGHT,
  };
  const arrow2Adjacent: Arrow = {
    id: 2,
    cells: [v(2, 3), v(3, 3), v(4, 3)],
    dir: RIGHT,
  };

  const level: Level = {
    size: 16,
    mask: new Array(16 * 16).fill(true),
    arrows: [arrow0, arrow1, arrow2Adjacent],
  };

  it('pickArrow picks the nearest of two arrows in range', () => {
    // arrow0 is at y=2 (line along y=2.5 from x=2.5 to 4.5).
    // arrow2Adjacent is at y=3 (line along y=3.5 from x=2.5 to 4.5).
    // They are adjacent, so neither is isolated -> leniency = 0.25 cells.
    // Tap at (3.0, 2.6):
    // Distance to arrow0 line (y=2.5) is 0.1 <= 0.25.
    // Distance to arrow2Adjacent line (y=3.5) is 0.9 > 0.25.
    const idleIds = new Set([0, 2]);
    const hit = pickArrow(level, idleIds, v(3.0, 2.6), 50);
    expect(hit).toBe(0);

    // Tap at (3.0, 3.4):
    // Distance to arrow0 line is 0.9.
    // Distance to arrow2Adjacent line is 0.1.
    const hit2 = pickArrow(level, idleIds, v(3.0, 3.4), 50);
    expect(hit2).toBe(2);
  });

  it('pickArrow returns undefined on empty space', () => {
    const idleIds = new Set([0, 1, 2]);
    // Far away tap at (10.0, 10.0)
    const hit = pickArrow(level, idleIds, v(10.0, 10.0), 50);
    expect(hit).toBeUndefined();
  });

  it('at the fitted view of a 64 board a tap 8 px from the line still hits', () => {
    // On a 64x64 board fitted to a 320px screen, cellSizePx is 5 px.
    // 10px minimum tolerance is 10 / 5 = 2.0 cells.
    // An 8 px offset corresponds to 8 / 5 = 1.6 cells from the line.
    // Under normal 0.25 leniency, 1.6 cells would miss.
    // But with the 10 px minimum rule, hitRadius is Math.max(0.25, 2.0) = 2.0 cells.
    // 1.6 <= 2.0, so the tap still hits!
    const singleArrow: Arrow = {
      id: 99,
      cells: [v(30, 30), v(31, 30), v(32, 30)],
      dir: RIGHT,
    };
    const board64: Level = {
      size: 64,
      mask: new Array(64 * 64).fill(true),
      arrows: [singleArrow],
    };
    const cellSizePx = 5; // e.g. 320px / 64 = 5 px
    // Arrow line is y = 30.5, x from 30.5 to 32.5.
    // Tap 8px away in y: 8 / 5 = 1.6 cells away -> y = 30.5 + 1.6 = 32.1.
    const tapCell = v(31.0, 30.5 + 8 / cellSizePx);
    const hit = pickArrow(board64, new Set([99]), tapCell, cellSizePx);
    expect(hit).toBe(99);
  });

  it('an arrow not in idleIds (removed, sliding or bumping) is never picked', () => {
    // Tap directly on arrow0 line (3.0, 2.5)
    // arrow0 is not in idleIds:
    const idleIds = new Set([1, 2]);
    const hit = pickArrow(level, idleIds, v(3.0, 2.5), 50);
    expect(hit).toBeUndefined();
  });

  it('isolated arrow gets 0.75 cell leniency', () => {
    // arrow1 at y=5 is isolated (arrow0 at y=2, arrow2 at y=3 are > 1 cell away).
    // Tap at y=5.5 + 0.6 = 6.1 (distance 0.6 cells from line y=5.5).
    // Since arrow1 is isolated, leniency is 0.75 cells.
    // At cellSizePx = 100, 10px / 100 = 0.1 cells < 0.75 cells.
    // So hit radius is 0.75 cells.
    // Distance 0.6 <= 0.75, so it hits arrow1!
    const idleIds = new Set([0, 1, 2]);
    const hit = pickArrow(level, idleIds, v(3.0, 6.1), 100);
    expect(hit).toBe(1);

    // But if arrow1 had an idle neighbor within 1 cell, leniency would be 0.25,
    // and distance 0.6 would miss!
    const neighborOf1: Arrow = {
      id: 3,
      cells: [v(2, 6), v(3, 6), v(4, 6)],
      dir: RIGHT,
    };
    const levelWithNeighbor: Level = {
      ...level,
      arrows: [...level.arrows, neighborOf1],
    };
    const hitWithNeighbor = pickArrow(
      levelWithNeighbor,
      new Set([0, 1, 2, 3]),
      v(3.0, 6.1),
      100,
    );
    // At distance 0.6 from arrow1 (y=5.5) and 0.4 from neighborOf1 (y=6.5):
    // Both have leniency 0.25 (since neither is isolated).
    // Distance 0.6 > 0.25 and 0.4 > 0.25, so neither hits!
    expect(hitWithNeighbor).toBeUndefined();
  });
});
