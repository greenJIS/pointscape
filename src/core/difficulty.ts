export interface Difficulty {
  readonly id: 'tiny' | 'compact' | 'large' | 'vast' | 'massive';
  readonly name: string;
}

export const DIFFICULTIES: readonly Difficulty[] = [
  { id: 'tiny', name: 'Tiny' },
  { id: 'compact', name: 'Compact' },
  { id: 'large', name: 'Large' },
  { id: 'vast', name: 'Vast' },
  { id: 'massive', name: 'Massive' },
];

export { SIZES } from './shapes';

export const LEVELS_PER_SIZE = 200;
export const UNLOCK_AFTER = 10;
export const SQUARE_LEVELS = 10;
