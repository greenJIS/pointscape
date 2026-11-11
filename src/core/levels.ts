import { LEVELS_PER_SIZE, SIZES } from './difficulty';
import { generateLevel, type GenParams } from './generator';
import { maskFor, shapeFor } from './shapes';
import type { Level } from './types';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function seedFor(sizeIndex: number, level: number): number {
  return 1000 + sizeIndex * 10000 + level * 37;
}

export function levelParams(sizeIndex: number, level: number): GenParams {
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
    seed: seedFor(sizeIndex, level),
    minLength,
    maxLength,
    bendChance,
    longBias,
    tangle,
  };
}

export const buildLevel = (sizeIndex: number, level: number): Level =>
  generateLevel(levelParams(sizeIndex, level));
