import { exitRay, inBounds } from './board';
import { blockedShare, emptyShare, meanLength } from './quality';
import { createRng, type Rng } from './rng';
import { isConnected } from './shapes';
import type { Arrow, Level, Vec } from './types';
import { add, DIRS, eq, key, neg, v } from './vec';

export interface GenParams {
  readonly size: number;
  readonly mask: readonly boolean[];
  readonly seed: number;
  readonly minLength: number;
  readonly maxLength: number;
  readonly bendChance: number;
  readonly longBias: number;
  readonly tangle: number;
}

interface MutableArrow {
  id: number;
  cells: Vec[];
  dir: Vec;
}

/**
 * Generates a solvable, packed 2D level using reverse construction,
 * snake growth, aimAtStuck, fillGaps, and boundary extensions.
 */
export function generateLevel(params: GenParams): Level {
  if (!isConnected(params.mask, params.size)) {
    throw new Error('mask is not connected');
  }

  const maxAttempts = 5;
  let bestLevel: Level | undefined;
  let bestEmpty = Infinity;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const attemptSeed =
      attempt === 0 ? params.seed : (params.seed + attempt * 0x9e3779b9) >>> 0;

    const level = buildLevel({ ...params, seed: attemptSeed });
    const es = emptyShare(level);
    const bs = blockedShare(level);
    const ml = meanLength(level);

    if (es <= 0.03 && bs >= 0.3 && ml >= 4.0) {
      return level;
    }

    if (es < bestEmpty) {
      bestEmpty = es;
      bestLevel = level;
    }
  }

  if (bestLevel) {
    const es = emptyShare(bestLevel);
    const bs = blockedShare(bestLevel);
    const ml = meanLength(bestLevel);
    if (es > 0.03) {
      throw new Error(`emptyShare floor missed: ${es.toFixed(4)} > 0.03`);
    }
    if (bs < 0.3) {
      throw new Error(`blockedShare floor missed: ${bs.toFixed(4)} < 0.30`);
    }
    if (ml < 4.0) {
      throw new Error(`meanLength floor missed: ${ml.toFixed(4)} < 4.0`);
    }
    return bestLevel;
  }

  throw new Error('failed to generate level');
}

function buildLevel(params: GenParams): Level {
  const { size, mask, seed } = params;
  const rng = createRng(seed);
  const totalCells = size * size;

  // Occupancy map: cell index -> arrow id (-1 if unoccupied)
  const taken = new Int32Array(totalCells).fill(-1);

  // Lanes: cell index -> list of arrow ids whose exit ray passes through this cell
  const lanes: number[][] = Array.from({ length: totalCells }, () => []);

  // Ordered list of arrows: removal order is reverse of `order`
  // (order[order.length - 1] leaves first, order[0] leaves last)
  const order: MutableArrow[] = [];
  const pos = new Map<number, number>();

  const reindex = (): void => {
    pos.clear();
    for (let i = 0; i < order.length; i++) {
      const a = order[i];
      if (a !== undefined) pos.set(a.id, i);
    }
  };

  const registerArrow = (arrow: MutableArrow): void => {
    for (const c of arrow.cells) {
      const idx = c.y * size + c.x;
      taken[idx] = arrow.id;
    }
    const ray = exitRay({ size }, arrow);
    for (const c of ray) {
      const idx = c.y * size + c.x;
      lanes[idx]?.push(arrow.id);
    }
  };

  // Blockers and chain depth for Phase 1 scoring
  const blockers: Set<number>[] = [];
  const depth: number[] = [];
  let nextArrowId = 0;

  // Count of mask cells
  let maskCount = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) maskCount++;
  }

  // Phase 1: Reverse construction placement
  const maxMisses = Math.min(100, Math.max(30, size * 2));
  let misses = 0;

  while (misses < maxMisses) {
    let best:
      | {
          arrow: MutableArrow;
          score: number;
          hit: Set<number>;
          rayLen: number;
        }
      | undefined;

    const candidatesCount = 16;
    for (let i = 0; i < candidatesCount; i++) {
      const early = 1 - order.length / Math.max(1, maskCount / 5);

      let aim: Vec | undefined;
      if (order.length > 0 && rng.chance(params.tangle * 0.9)) {
        aim = aimAtStuck(
          size,
          mask,
          order,
          depth,
          blockers,
          taken,
          rng,
          params.tangle,
        );
      }

      const cand = candidate(params, taken, nextArrowId, rng, early, aim);
      if (!cand) continue;

      const ray = exitRay({ size }, cand);
      const ownKeys = new Set(cand.cells.map(key));
      let rayBlocked = false;
      for (const c of ray) {
        const idx = c.y * size + c.x;
        if (taken[idx] !== -1 || ownKeys.has(key(c))) {
          rayBlocked = true;
          break;
        }
      }
      if (rayBlocked) continue;

      const hit = new Set<number>();
      for (const c of cand.cells) {
        const idx = c.y * size + c.x;
        const covering = lanes[idx];
        if (covering) {
          for (const id of covering) hit.add(id);
        }
      }

      let gain = 0;
      for (const id of hit) {
        gain += 1 + (depth[id] ?? 0);
      }

      const score =
        (1 - params.tangle) * (ray.length * 0.5 + bends(cand) * 2) +
        params.tangle * gain * 8 +
        rng.next();

      if (!best || score > best.score) {
        best = { arrow: cand, score, hit, rayLen: ray.length };
      }
    }

    if (!best) {
      misses++;
      continue;
    }

    misses = 0;
    const arrow = best.arrow;
    const id = arrow.id;
    nextArrowId++;

    order.push(arrow);
    registerArrow(arrow);
    pos.set(id, order.length - 1);

    blockers.push(new Set());
    depth.push(0);
    for (const other of best.hit) {
      blockers[other]?.add(id);
    }
    for (let i = id; i >= 0; i--) {
      let d = 0;
      for (const b of blockers[i] ?? []) {
        d = Math.max(d, 1 + (depth[b] ?? 0));
      }
      depth[i] = d;
    }
  }

  // Phase 2: fillGaps
  const targets = [params.maxLength, Math.min(params.maxLength, 6), 4, 3, 2];

  for (const target of targets) {
    let progress = true;
    while (progress) {
      progress = false;
      const emptyCells: Vec[] = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = y * size + x;
          if (mask[idx] && taken[idx] === -1) {
            emptyCells.push(v(x, y));
          }
        }
      }

      shuffle(emptyCells, rng);

      for (const head of emptyCells) {
        const headIdx = head.y * size + head.x;
        if (taken[headIdx] !== -1) continue;

        let bestFit:
          | { arrow: MutableArrow; lo: number; hi: number; score: number }
          | undefined;

        const dirList = [...DIRS];
        shuffle(dirList, rng);

        for (const dir of dirList) {
          const ray = exitRay({ size }, { id: 0, cells: [head], dir });

          const ahead = new Set<number>();
          for (const c of ray) {
            const idx = c.y * size + c.x;
            const occupier = taken[idx];
            if (occupier !== undefined && occupier !== -1) {
              ahead.add(occupier);
            }
          }

          let hi = order.length;
          for (const id of ahead) {
            const p = pos.get(id);
            if (p !== undefined) hi = Math.min(hi, p);
          }
          if (hi <= 0) continue;

          const arrow = snake(
            params,
            taken,
            nextArrowId,
            head,
            dir,
            target,
            rng,
            2,
          );
          if (!arrow) continue;

          const ownKeys = new Set(arrow.cells.map(key));
          if (ray.some((c) => ownKeys.has(key(c)))) continue;

          const crossing = new Set<number>();
          for (const c of arrow.cells) {
            const idx = c.y * size + c.x;
            const l = lanes[idx];
            if (l) {
              for (const id of l) crossing.add(id);
            }
          }

          let lo = -1;
          for (const id of crossing) {
            const p = pos.get(id);
            if (p !== undefined) lo = Math.max(lo, p);
          }

          if (lo >= hi) continue;

          const score = arrow.cells.length * 2 + rng.next();
          if (!bestFit || score > bestFit.score) {
            bestFit = { arrow, lo, hi, score };
          }
        }

        if (bestFit) {
          const at = bestFit.lo + 1 + rng.int(bestFit.hi - bestFit.lo);
          order.splice(at, 0, bestFit.arrow);
          nextArrowId++;
          registerArrow(bestFit.arrow);
          reindex();
          progress = true;
        }
      }
    }
  }

  // Phase 3: Extend arrow ends into empty cells
  extendEnds(size, mask, order, taken, lanes, pos);

  const finalArrows: Arrow[] = order.map((a, i) => ({
    id: i,
    cells: a.cells,
    dir: a.dir,
  }));

  return {
    size,
    mask,
    arrows: finalArrows,
  };
}

/**
 * Extends arrows at tail or head into adjacent empty mask cells if solvability is maintained.
 */
function extendEnds(
  size: number,
  mask: readonly boolean[],
  order: MutableArrow[],
  taken: Int32Array,
  lanes: number[][],
  pos: Map<number, number>,
): void {
  let extended = true;
  while (extended) {
    extended = false;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cellIdx = y * size + x;
        if (!mask[cellIdx] || taken[cellIdx] !== -1) continue;

        const cell = v(x, y);

        // 1. Try extending at a tail
        for (const d of DIRS) {
          const neighbor = add(cell, d);
          if (!inBounds(size, neighbor)) continue;
          const nIdx = neighbor.y * size + neighbor.x;
          const arrowId = taken[nIdx];
          if (arrowId === undefined || arrowId === -1) continue;

          const arrow = order.find((a) => a.id === arrowId);
          if (!arrow) continue;

          const tail = arrow.cells[0];
          if (!tail || !eq(tail, neighbor)) continue;

          // Check that `cell` is not on arrow's own exit ray
          const ray = exitRay({ size }, arrow);
          if (ray.some((c) => eq(c, cell))) continue;

          const arrowPos = pos.get(arrow.id) ?? -1;
          const crossing = lanes[cellIdx] ?? [];
          let blockedAhead = false;
          for (const otherId of crossing) {
            if (otherId === arrow.id) continue;
            const otherPos = pos.get(otherId) ?? -1;
            if (otherPos >= arrowPos) {
              blockedAhead = true;
              break;
            }
          }
          if (blockedAhead) continue;

          arrow.cells.unshift(cell);
          taken[cellIdx] = arrow.id;
          extended = true;
          break;
        }

        if (taken[cellIdx] !== -1) continue;

        // 2. Try extending at a head: if cell is directly in front of head: cell = head + arrow.dir
        for (const arrow of order) {
          const head = arrow.cells[arrow.cells.length - 1];
          if (!head) continue;
          const expectedNext = add(head, arrow.dir);
          if (!eq(expectedNext, cell)) continue;

          const arrowPos = pos.get(arrow.id) ?? -1;
          const crossing = lanes[cellIdx] ?? [];
          let blockedAhead = false;
          for (const otherId of crossing) {
            if (otherId === arrow.id) continue;
            const otherPos = pos.get(otherId) ?? -1;
            if (otherPos >= arrowPos) {
              blockedAhead = true;
              break;
            }
          }
          if (blockedAhead) continue;

          // Valid head extension!
          arrow.cells.push(cell);
          taken[cellIdx] = arrow.id;
          extended = true;
          break;
        }
      }
    }
  }
}

function aimAtStuck(
  size: number,
  mask: readonly boolean[],
  placed: readonly MutableArrow[],
  depth: readonly number[],
  blockers: readonly Set<number>[],
  taken: Int32Array,
  rng: Rng,
  tangle: number,
): Vec | undefined {
  let pick = rng.int(placed.length);
  const looks = 1 + Math.round(tangle * 11);
  const deep = rng.chance(0.5);

  for (let i = 0; i < looks; i++) {
    const other = rng.int(placed.length);
    const better = deep
      ? (depth[other] ?? 0) > (depth[pick] ?? 0)
      : (blockers[other]?.size ?? 0) === 0 && (blockers[pick]?.size ?? 0) > 0;
    if (better) pick = other;
  }

  const target = placed[pick];
  if (!target) return undefined;

  const ray = exitRay({ size }, target);
  const open: Vec[] = [];
  for (const c of ray) {
    const idx = c.y * size + c.x;
    if (mask[idx] && taken[idx] === -1) {
      open.push(c);
    }
  }

  return open.length > 0 ? rng.pick(open) : undefined;
}

/** Chance, while the board is still empty, that a placed arrow is a giant. */
const GIANT_CHANCE = 0.03;

function pickLength(p: GenParams, early: number, rng: Rng): number {
  // A few very long lines per board, as in the original: about half to a full board width.
  if (rng.chance(GIANT_CHANCE * early))
    return Math.round(p.size * 0.6) + rng.int(Math.round(p.size * 0.6));
  const mid = Math.max(
    p.minLength,
    Math.floor((p.minLength + p.maxLength) / 2),
  );
  const long = rng.chance(p.longBias * early);
  const lo = long ? mid : p.minLength;
  const hi = long ? p.maxLength : mid;
  return lo + rng.int(Math.max(1, hi - lo + 1));
}

function candidate(
  p: GenParams,
  taken: Int32Array,
  id: number,
  rng: Rng,
  early: number,
  aim?: Vec,
): MutableArrow | undefined {
  let head: Vec;
  if (aim) {
    head = aim;
  } else {
    const freeCells: Vec[] = [];
    for (let y = 0; y < p.size; y++) {
      for (let x = 0; x < p.size; x++) {
        const idx = y * p.size + x;
        if (p.mask[idx] && taken[idx] === -1) {
          freeCells.push(v(x, y));
        }
      }
    }
    if (freeCells.length === 0) return undefined;
    head = rng.pick(freeCells);
  }

  const headIdx = head.y * p.size + head.x;
  if (!p.mask[headIdx] || taken[headIdx] !== -1) return undefined;

  const dir = rng.pick(DIRS);
  const length = pickLength(p, early, rng);

  return snake(p, taken, id, head, dir, length, rng);
}

function snake(
  p: GenParams,
  taken: Int32Array,
  id: number,
  head: Vec,
  dir: Vec,
  target: number,
  rng: Rng,
  minLen: number = p.minLength,
): MutableArrow | undefined {
  const { size, mask } = p;
  const headIdx = head.y * size + head.x;
  if (!mask[headIdx] || taken[headIdx] !== -1) return undefined;

  const ray = exitRay({ size }, { id: 0, cells: [head], dir });
  const onRay = new Uint8Array(size * size);
  for (const c of ray) {
    onRay[c.y * size + c.x] = 1;
  }

  const used = new Uint8Array(size * size);
  used[headIdx] = 1;
  const back: Vec[] = [head];

  const isCellFree = (c: Vec): boolean => {
    if (!inBounds(size, c)) return false;
    const idx = c.y * size + c.x;
    return (
      mask[idx] === true &&
      taken[idx] === -1 &&
      used[idx] === 0 &&
      onRay[idx] === 0
    );
  };

  const firstBack = add(head, neg(dir));
  if (!isCellFree(firstBack)) return undefined;

  const firstIdx = firstBack.y * size + firstBack.x;
  used[firstIdx] = 1;
  back.push(firstBack);
  let heading = neg(dir);

  while (back.length < target) {
    const at = back[back.length - 1];
    if (!at) break;

    const perp1 = v(-heading.y, heading.x);
    const perp2 = v(heading.y, -heading.x);
    const straight = heading;
    const allOptions = [straight, perp1, perp2].filter((d) =>
      isCellFree(add(at, d)),
    );

    if (allOptions.length === 0) break;

    let step: Vec | undefined;

    if (rng.chance(p.bendChance)) {
      const turns = [perp1, perp2].filter((d) => isCellFree(add(at, d)));
      if (turns.length > 0) {
        let bestScore = Infinity;
        for (const d of turns) {
          const next = add(at, d);
          let open = 0;
          for (const e of DIRS) {
            if (isCellFree(add(next, e))) open++;
          }
          const score = open + rng.next() * 0.4;
          if (score < bestScore) {
            bestScore = score;
            step = d;
          }
        }
      } else {
        step = straight;
      }
    } else {
      const straightFree = isCellFree(add(at, straight));
      if (straightFree && rng.chance(0.6)) {
        step = straight;
      } else {
        let bestScore = Infinity;
        for (const d of allOptions) {
          const next = add(at, d);
          let open = 0;
          for (const e of DIRS) {
            if (isCellFree(add(next, e))) open++;
          }
          const score = open + rng.next() * 0.4;
          if (score < bestScore) {
            bestScore = score;
            step = d;
          }
        }
      }
    }

    if (!step) break;

    const next = add(at, step);
    const nextIdx = next.y * size + next.x;
    used[nextIdx] = 1;
    back.push(next);
    heading = step;
  }

  if (back.length < Math.max(2, minLen)) {
    return undefined;
  }

  return {
    id,
    cells: back.reverse(),
    dir,
  };
}

function bends(arrow: MutableArrow): number {
  let count = 0;
  for (let i = 2; i < arrow.cells.length; i++) {
    const a = arrow.cells[i - 2];
    const b = arrow.cells[i - 1];
    const c = arrow.cells[i];
    if (!a || !b || !c) continue;
    if (b.x - a.x !== c.x - b.x || b.y - a.y !== c.y - b.y) count++;
  }
  return count;
}

function shuffle<T>(items: T[], rng: Rng): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const a = items[i];
    const b = items[j];
    if (a === undefined || b === undefined) continue;
    items[i] = b;
    items[j] = a;
  }
}
