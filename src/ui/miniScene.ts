import { useSyncExternalStore } from 'react';
import type { Arrow, Level } from '../core/types';
import type { HoldPreview } from '../view/draw';

/** One arrow on a small board: cells from tail to head, as [column, row] in the visible area. */
export interface MiniArrow {
  readonly cells: readonly (readonly [number, number])[];
  readonly dir: readonly [number, number];
  readonly color: string;
}

export interface MiniScene {
  readonly cols: number;
  readonly rows: number;
  readonly level: Level;
  readonly colors: readonly string[];
}

/**
 * Builds a level for a `cols` by `rows` picture. The game board is square, so the picture sits in the middle of
 * a square board and the canvas shows only that strip. Arrow ids follow the order of `arrows`.
 */
export function miniScene(
  cols: number,
  rows: number,
  arrows: readonly MiniArrow[],
): MiniScene {
  const size = Math.max(cols, rows);
  const ox = Math.floor((size - cols) / 2);
  const oy = Math.floor((size - rows) / 2);
  const mask = Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    return x >= ox && x < ox + cols && y >= oy && y < oy + rows;
  });
  const built: Arrow[] = arrows.map((a, id) => ({
    id,
    cells: a.cells.map(([x, y]) => ({ x: x + ox, y: y + oy })),
    dir: { x: a.dir[0], y: a.dir[1] },
  }));
  return {
    cols,
    rows,
    level: { size, mask, arrows: built },
    colors: arrows.map((a) => a.color),
  };
}

/** The dashed path the game shows while an arrow is held: green when clear, red when blocked. */
export function previewOf(
  arrowId: number,
  blocked: boolean,
  reach: number,
): HoldPreview {
  return { arrowId, blocked, reach };
}

const subscribe = (notify: () => void): (() => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  return () => observer.disconnect();
};
const isDark = (): boolean => document.documentElement.dataset.theme === 'dark';

/** True while the page is in the dark theme; follows the Settings switch. */
export function useDark(): boolean {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
