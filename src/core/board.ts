import type { Arrow, Level, Vec } from './types';
import { add, eq, key, sub } from './vec';

export function inBounds(size: number, c: Vec): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < size && c.y < size;
}

export function inMask(level: Pick<Level, 'size' | 'mask'>, c: Vec): boolean {
  if (!inBounds(level.size, c)) return false;
  return level.mask[c.y * level.size + c.x] === true;
}

export function headOf(arrow: Arrow): Vec {
  const head = arrow.cells[arrow.cells.length - 1];
  if (head === undefined) throw new Error(`arrow ${arrow.id} has no cells`);
  return head;
}

/** Cells from head + dir to the bounding-box edge, mask holes included. */
export function exitRay(level: Pick<Level, 'size'>, arrow: Arrow): Vec[] {
  const ray: Vec[] = [];
  let c = add(headOf(arrow), arrow.dir);
  while (inBounds(level.size, c)) {
    ray.push(c);
    c = add(c, arrow.dir);
  }
  return ray;
}

/** Map from cell key to the Arrow that occupies it. */
export function occupancy(arrows: readonly Arrow[]): Map<string, Arrow> {
  const map = new Map<string, Arrow>();
  for (const arrow of arrows) {
    for (const c of arrow.cells) {
      map.set(key(c), arrow);
    }
  }
  return map;
}

/** The first arrow on the exit ray, or undefined if the ray is clear. */
export function blockerOf(
  level: Pick<Level, 'size' | 'arrows'>,
  arrow: Arrow,
  occupied?: ReadonlyMap<string, Arrow>,
): Arrow | undefined {
  const map = occupied ?? occupancy(level.arrows);
  for (const c of exitRay(level, arrow)) {
    const blocker = map.get(key(c));
    if (blocker !== undefined) return blocker;
  }
  return undefined;
}

export function isFree(
  level: Pick<Level, 'size' | 'arrows'>,
  arrow: Arrow,
  occupied?: ReadonlyMap<string, Arrow>,
): boolean {
  return blockerOf(level, arrow, occupied) === undefined;
}

/**
 * Checks that a level is well-formed:
 * - arrow cells inside mask
 * - no overlapping arrows
 * - adjacent consecutive cells
 * - dir equals last segment direction
 * - own body not on exit ray
 */
export function validateLevel(level: Level): string[] {
  const problems: string[] = [];
  const seen = new Map<string, number>();

  for (const arrow of level.arrows) {
    if (arrow.cells.length < 2) {
      problems.push(`arrow ${arrow.id} has fewer than 2 cells`);
    }

    const head = arrow.cells[arrow.cells.length - 1];
    const prev = arrow.cells[arrow.cells.length - 2];
    if (head !== undefined && prev !== undefined) {
      const lastSegmentDir = sub(head, prev);
      if (!eq(arrow.dir, lastSegmentDir)) {
        problems.push(
          `arrow ${arrow.id} dir does not match last segment direction`,
        );
      }
    }

    arrow.cells.forEach((c, i) => {
      if (!inMask(level, c)) {
        problems.push(`arrow ${arrow.id} cell outside mask`);
      }
      const other = seen.get(key(c));
      if (other !== undefined) {
        problems.push(`arrow ${arrow.id} overlaps arrow ${other}`);
      }
      seen.set(key(c), arrow.id);

      const prevCell = arrow.cells[i - 1];
      if (prevCell !== undefined) {
        const d = Math.abs(c.x - prevCell.x) + Math.abs(c.y - prevCell.y);
        if (d !== 1) {
          problems.push(`arrow ${arrow.id} non-adjacent consecutive cells`);
        }
      }
    });

    const own = new Set(arrow.cells.map(key));
    if (
      arrow.cells.length > 0 &&
      exitRay(level, arrow).some((c) => own.has(key(c)))
    ) {
      problems.push(`arrow ${arrow.id} has own body on exit ray`);
    }
  }

  return problems;
}
