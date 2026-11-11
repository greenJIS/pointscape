import { LEVELS_PER_SIZE, SIZES, UNLOCK_AFTER } from '../core/difficulty';

export const STARTING_HINTS = 3;
/** One hint is gifted for every this many first-time clears (FR-30). */
export const HINT_GIFT_EVERY = 5;

export interface Progress {
  /** Cleared level numbers per size (0 to 4), sorted, no duplicates. */
  readonly cleared: readonly (readonly number[])[];
  readonly hints: number;
  readonly seenTutorial: boolean;
  /** The level the player should see next on Home. */
  readonly last: { readonly difficulty: number; readonly level: number };
}

export const emptyProgress = (): Progress => ({
  cleared: Array.from({ length: SIZES.length }, () => []),
  hints: STARTING_HINTS,
  seenTutorial: false,
  last: { difficulty: 0, level: 1 },
});

export const clearedCount = (p: Progress, difficulty: number): number =>
  p.cleared[difficulty]?.length ?? 0;

export const totalCleared = (p: Progress): number =>
  p.cleared.reduce((n, list) => n + list.length, 0);

export const isCleared = (
  p: Progress,
  difficulty: number,
  level: number,
): boolean => p.cleared[difficulty]?.includes(level) ?? false;

/** The size that must be cleared (UNLOCK_AFTER levels) to open this one, or null for the first. */
export function prerequisite(difficulty: number): number | null {
  if (difficulty > 0 && difficulty < SIZES.length) {
    return difficulty - 1;
  }
  return null;
}

/** The sizes that clearing this one opens. */
export function opens(difficulty: number): number[] {
  if (difficulty + 1 < SIZES.length) {
    return [difficulty + 1];
  }
  return [];
}

export function isSizeUnlocked(
  difficulty: number,
  p: Progress,
  unlockAll: boolean,
): boolean {
  if (difficulty < 0 || difficulty >= SIZES.length) return false;
  if (unlockAll) return true;
  const need = prerequisite(difficulty);
  if (need === null) return true;
  return clearedCount(p, need) >= UNLOCK_AFTER;
}

/**
 * The only place that decides what is playable (FR-28). `unlockAll` is the
 * developer switch (FR-25). Nothing is stored for it, so it never leaks into
 * real progress (FR-27).
 */
export function isUnlocked(
  difficulty: number,
  level: number,
  p: Progress,
  unlockAll: boolean,
): boolean {
  if (difficulty < 0 || difficulty >= SIZES.length) return false;
  if (level < 1 || level > LEVELS_PER_SIZE) return false;
  if (unlockAll) return true;
  if (!isSizeUnlocked(difficulty, p, false)) return false;
  return (
    level === 1 ||
    isCleared(p, difficulty, level - 1) ||
    isCleared(p, difficulty, level)
  );
}

/** First level of a size that has not been cleared, or 1 when all are. */
export function nextLevel(p: Progress, difficulty: number): number {
  for (let l = 1; l <= LEVELS_PER_SIZE; l++) {
    if (!isCleared(p, difficulty, l)) return l;
  }
  return 1;
}

export interface ClearResult {
  readonly progress: Progress;
  /** False when the level was already cleared. A replay changes nothing. */
  readonly firstClear: boolean;
  readonly hintGifted: boolean;
  /** The sizes this clear just opened. Empty most of the time. */
  readonly unlocked: readonly number[];
}

export function recordClear(
  p: Progress,
  difficulty: number,
  level: number,
): ClearResult {
  if (isCleared(p, difficulty, level)) {
    return {
      progress: { ...p, last: nextAfter(difficulty, level) },
      firstClear: false,
      hintGifted: false,
      unlocked: [],
    };
  }
  const before = clearedCount(p, difficulty);
  const cleared = p.cleared.map((list, i) =>
    i === difficulty ? [...list, level].sort((a, b) => a - b) : list,
  );
  const next: Progress = { ...p, cleared };
  const gift = totalCleared(next) % HINT_GIFT_EVERY === 0;
  const crossed =
    before < UNLOCK_AFTER && clearedCount(next, difficulty) >= UNLOCK_AFTER;
  return {
    progress: {
      ...next,
      hints: next.hints + (gift ? 1 : 0),
      last: nextAfter(difficulty, level),
    },
    firstClear: true,
    hintGifted: gift,
    unlocked: crossed ? opens(difficulty) : [],
  };
}

function nextAfter(
  difficulty: number,
  level: number,
): { difficulty: number; level: number } {
  return {
    difficulty,
    level: level < LEVELS_PER_SIZE ? level + 1 : level,
  };
}

/** Spends a hint. Returns null when none are left. */
export function spendHint(p: Progress): Progress | null {
  return p.hints > 0 ? { ...p, hints: p.hints - 1 } : null;
}

/** The first-level coach mark has been dismissed (it shows once). */
export const markTutorialSeen = (p: Progress): Progress =>
  p.seenTutorial ? p : { ...p, seenTutorial: true };
