import { assignColors } from '../core/coloring';
import type { Level } from '../core/types';

/** The five arrow colours (FR-31). Same values as the `@theme` tokens in index.css. */
export const POOL: readonly string[] = [
  '#ff8a00',
  '#ffe600',
  '#00f5d0',
  '#5b6bff',
  '#ff2bd6',
];

export const BLOCKED = '#ff4d5e';

export interface PaletteSettings {
  readonly colorMode?: 'multi' | 'one' | string;
  readonly oneColor?: string;
}

/** Colour per arrow id with touching arrows kept apart where the pool allows (FR-36). */
export function arrowColors(level: Level, settings?: unknown): string[] {
  if (
    typeof settings === 'object' &&
    settings !== null &&
    'colorMode' in settings &&
    (settings as PaletteSettings).colorMode === 'one' &&
    'oneColor' in settings &&
    typeof (settings as PaletteSettings).oneColor === 'string'
  ) {
    const single =
      (settings as PaletteSettings).oneColor ?? POOL[0] ?? '#00f5d0';
    const result = new Array<string>(level.arrows.length);
    for (const a of level.arrows) {
      result[a.id] = single;
    }
    return result;
  }

  const seed = level.size * 131 + level.arrows.length * 17;
  const picked = assignColors(level, POOL.length, seed);
  const result = new Array<string>(level.arrows.length);
  for (const a of level.arrows) {
    const c = picked[a.id];
    const hex = c !== undefined ? POOL[c] : undefined;
    result[a.id] = hex ?? '#ffffff';
  }
  return result;
}
