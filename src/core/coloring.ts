import { createRng } from './rng';
import type { Level } from './types';
import { DIRS, key } from './vec';

/** Arrow ids that touch each arrow: a cell sits next to a cell of another arrow (FR-36). */
export function neighbours(level: Level): Map<number, Set<number>> {
  const owner = new Map<string, number>();
  for (const a of level.arrows) {
    for (const c of a.cells) {
      owner.set(key(c), a.id);
    }
  }

  const result = new Map<number, Set<number>>();
  for (const a of level.arrows) {
    const near = new Set<number>();
    for (const c of a.cells) {
      for (const d of DIRS) {
        const other = owner.get(key({ x: c.x + d.x, y: c.y + d.y }));
        if (other !== undefined && other !== a.id) {
          near.add(other);
        }
      }
    }
    result.set(a.id, near);
  }
  return result;
}

/**
 * Colour index map per arrow, 0 to `poolSize - 1`. Greedy: each arrow takes the colour its
 * touching arrows use least, ties broken by a seeded generator.
 */
export function assignColorsMap(
  level: Level,
  poolSize: number,
  seed: number,
): Map<number, number> {
  if (poolSize <= 0 || level.arrows.length === 0) {
    return new Map();
  }
  const rng = createRng(seed);
  const near = neighbours(level);
  const result = new Map<number, number>();

  for (const a of level.arrows) {
    const counts = new Array<number>(poolSize).fill(0);
    for (const n of near.get(a.id) ?? []) {
      const c = result.get(n);
      if (c !== undefined && c >= 0 && c < poolSize) {
        counts[c] = (counts[c] ?? 0) + 1;
      }
    }
    const best = Math.min(...counts);
    const options = counts.flatMap((n, i) => (n === best ? [i] : []));
    result.set(a.id, rng.pick(options));
  }
  return result;
}

/**
 * Colour index per arrow, 0 to `poolSize - 1`. Greedy: each arrow takes the colour its
 * touching arrows use least, ties broken by a seeded generator. Best effort when the
 * pool is too small, and the same every time for a given level and seed (FR-36).
 * Returns array indexed by arrow.id (length = level.arrows.length).
 */
export function assignColors(
  level: Level,
  poolSize: number,
  seed: number,
): number[] {
  const map = assignColorsMap(level, poolSize, seed);
  const result = new Array<number>(level.arrows.length);
  for (const a of level.arrows) {
    const c = map.get(a.id);
    if (c !== undefined) {
      result[a.id] = c;
    }
  }
  return result;
}
