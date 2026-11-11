import { blockerOf, occupancy } from './board';
import type { Level } from './types';
import { key } from './vec';

/**
 * Removing an arrow only ever frees other arrows, never blocks one.
 * Greedy removal clears the level if and only if the level is solvable.
 * Returns arrow IDs in removal order, or null when stuck.
 */
export function solve(level: Level): number[] | null {
  const remaining = new Map(level.arrows.map((a) => [a.id, a]));
  const occupied = occupancy(level.arrows);
  const order: number[] = [];

  while (remaining.size > 0) {
    const next = [...remaining.values()].find(
      (a) => blockerOf(level, a, occupied) === undefined,
    );
    if (!next) return null;
    remaining.delete(next.id);
    for (const c of next.cells) {
      occupied.delete(key(c));
    }
    order.push(next.id);
  }
  return order;
}

export function isSolvable(level: Level): boolean {
  return solve(level) !== null;
}

/**
 * ID of the first free arrow, or undefined when the board is empty or stuck.
 */
export function hint(level: Level): number | undefined {
  const occupied = occupancy(level.arrows);
  return level.arrows.find((a) => blockerOf(level, a, occupied) === undefined)
    ?.id;
}
