import { describe, expect, it } from 'vitest';
import { assignColors, neighbours } from './coloring';
import { buildLevel } from './levels';
import type { Arrow, Level } from './types';
import { DOWN, RIGHT } from './vec';

describe('neighbours', () => {
  it('identifies 4-directionally adjacent arrows without diagonal adjacency', () => {
    const a0: Arrow = { id: 0, cells: [{ x: 0, y: 0 }], dir: RIGHT };
    const a1: Arrow = { id: 1, cells: [{ x: 1, y: 0 }], dir: RIGHT };
    const a2: Arrow = { id: 2, cells: [{ x: 0, y: 1 }], dir: DOWN };
    const a3: Arrow = { id: 3, cells: [{ x: 1, y: 1 }], dir: DOWN };
    const a4: Arrow = { id: 4, cells: [{ x: 3, y: 3 }], dir: RIGHT };
    const level: Level = {
      size: 4,
      mask: new Array<boolean>(16).fill(true),
      arrows: [a0, a1, a2, a3, a4],
    };

    const map = neighbours(level);
    expect(map.get(0)).toEqual(new Set([1, 2]));
    expect(map.get(1)).toEqual(new Set([0, 3]));
    expect(map.get(2)).toEqual(new Set([0, 3]));
    expect(map.get(3)).toEqual(new Set([1, 2]));
    expect(map.get(4)).toEqual(new Set());
  });
});

describe('assignColors', () => {
  it('touching arrows never share a colour when the pool allows it', () => {
    const a0: Arrow = { id: 0, cells: [{ x: 0, y: 0 }], dir: RIGHT };
    const a1: Arrow = { id: 1, cells: [{ x: 1, y: 0 }], dir: RIGHT };
    const a2: Arrow = { id: 2, cells: [{ x: 0, y: 1 }], dir: RIGHT };
    const level: Level = {
      size: 2,
      mask: [true, true, true, true],
      arrows: [a0, a1, a2],
    };
    const colors = assignColors(level, 5, 42);
    const near = neighbours(level);
    for (const [id, touching] of near) {
      for (const other of touching) {
        expect(colors[id]).not.toBe(colors[other]);
      }
    }
  });

  it('is the same every time for a level and seed (FR-36)', () => {
    const level = buildLevel(0, 5);
    expect(assignColors(level, 5, 7)).toEqual(assignColors(level, 5, 7));
  });

  it('keeps most touching arrows apart on a crowded board', () => {
    const level = buildLevel(0, 40);
    const colors = assignColors(level, 5, 1);
    let pairs = 0;
    let same = 0;
    for (const [id, near] of neighbours(level)) {
      for (const n of near) {
        if (n < id) continue;
        pairs++;
        if (colors[id] === colors[n]) same++;
      }
    }
    expect(pairs).toBeGreaterThan(0);
    expect(same / pairs).toBeLessThan(0.05);
  });

  it('colours every arrow inside the pool', () => {
    const level = buildLevel(2, 10);
    const colors = assignColors(level, 5, 3);
    expect(colors.length).toBe(level.arrows.length);
    for (const c of colors) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThan(5);
    }
  });
});
