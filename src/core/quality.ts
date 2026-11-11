import { isFree, occupancy } from './board';
import type { Level } from './types';

/** Share of mask cells that have no arrow on them, in [0, 1]. */
export function emptyShare(level: Level): number {
  let maskCount = 0;
  for (let i = 0; i < level.mask.length; i++) {
    if (level.mask[i]) maskCount++;
  }
  if (maskCount === 0) return 0;

  let occupiedCount = 0;
  for (const arrow of level.arrows) {
    occupiedCount += arrow.cells.length;
  }

  return (maskCount - occupiedCount) / maskCount;
}

/** Share of arrows that cannot leave at the start because another arrow blocks their path. */
export function blockedShare(level: Level): number {
  if (level.arrows.length === 0) return 0;

  const occupied = occupancy(level.arrows);
  let blockedCount = 0;
  for (const arrow of level.arrows) {
    if (!isFree(level, arrow, occupied)) {
      blockedCount++;
    }
  }

  return blockedCount / level.arrows.length;
}

/** Average number of cells per arrow. */
export function meanLength(level: Level): number {
  if (level.arrows.length === 0) return 0;

  let totalCells = 0;
  for (const arrow of level.arrows) {
    totalCells += arrow.cells.length;
  }

  return totalCells / level.arrows.length;
}
