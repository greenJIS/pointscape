import { validateLevel } from './board';
import { LEVELS_PER_SIZE, SIZES } from './difficulty';
import { generateLevel, type GenParams } from './generator';
import { maskFor, shapeFor } from './shapes';
import { isSolvable } from './solver';
import type { Level } from './types';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function seedFor(sizeIndex: number, level: number): number {
  return 1000 + sizeIndex * 10000 + level * 37;
}

export function levelParams(
  sizeIndex: number,
  level: number,
  seedOverride?: number,
): GenParams {
  if (
    !Number.isInteger(sizeIndex) ||
    sizeIndex < 0 ||
    sizeIndex >= SIZES.length
  ) {
    throw new RangeError(
      `sizeIndex ${sizeIndex} is outside 0 to ${SIZES.length - 1}`,
    );
  }
  if (!Number.isInteger(level) || level < 1 || level > LEVELS_PER_SIZE) {
    throw new RangeError(`level ${level} is outside 1 to ${LEVELS_PER_SIZE}`);
  }

  const size = SIZES[sizeIndex];
  if (size === undefined) {
    throw new RangeError(`invalid sizeIndex ${sizeIndex}`);
  }

  const t = (level - 1) / (LEVELS_PER_SIZE - 1);
  const shape = shapeFor(sizeIndex, level);
  const mask = maskFor(shape, size);

  const minLength = 3;
  const baseMax = 6 + sizeIndex;
  const maxLength = Math.round(lerp(baseMax, baseMax + 3, t));
  const bendChance = lerp(0.4, 0.6, t);
  const longBias = lerp(0.6, 0.9, t);
  const tangle = lerp(0.2, 0.8, t);

  return {
    size,
    mask,
    seed: seedOverride ?? seedFor(sizeIndex, level),
    minLength,
    maxLength,
    bendChance,
    longBias,
    tangle,
  };
}

export const buildLevel = (
  sizeIndex: number,
  level: number,
  seed?: number,
): Level => generateLevel(levelParams(sizeIndex, level, seed));

export function buildSafeLevel(
  sizeIndex: number,
  level: number,
  builder: (
    sizeIndex: number,
    level: number,
    seed?: number,
  ) => Level = buildLevel,
): Level {
  const baseSeed = seedFor(sizeIndex, level);
  const maxAttempts = 100;
  for (let offset = 0; offset < maxAttempts; offset++) {
    const seed = baseSeed + offset;
    try {
      const board = builder(sizeIndex, level, seed);
      if (validateLevel(board).length === 0 && isSolvable(board)) {
        return board;
      }
    } catch (err) {
      if (err instanceof RangeError) {
        throw err;
      }
    }
  }
  throw new Error(
    `Failed to generate a valid solvable level for sizeIndex ${sizeIndex} level ${level}`,
  );
}
