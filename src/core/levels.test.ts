import { describe, expect, it } from 'vitest';
import { validateLevel } from './board';
import {
  DIFFICULTIES,
  LEVELS_PER_SIZE,
  SIZES,
  SQUARE_LEVELS,
} from './difficulty';
import { buildLevel, levelParams, seedFor } from './levels';
import { blockedShare, emptyShare, meanLength } from './quality';
import { isSolvable } from './solver';

describe('levels', () => {
  it('seedFor is unique for all 1000 levels', () => {
    const seeds = new Set<number>();
    for (let s = 0; s < SIZES.length; s++) {
      for (let l = 1; l <= LEVELS_PER_SIZE; l++) {
        seeds.add(seedFor(s, l));
      }
    }
    expect(seeds.size).toBe(SIZES.length * LEVELS_PER_SIZE);
  });

  it('levels 1 to 10 of every size use a full square mask', () => {
    for (let s = 0; s < SIZES.length; s++) {
      const size = SIZES[s];
      expect(size).toBeDefined();
      if (size === undefined) continue;
      for (let l = 1; l <= SQUARE_LEVELS; l++) {
        const params = levelParams(s, l);
        expect(params.mask.length).toBe(size * size);
        expect(params.mask.every((cell) => cell === true)).toBe(true);
      }
    }
  });

  it('buildLevel is deterministic', () => {
    const levelA = buildLevel(0, 1);
    const levelB = buildLevel(0, 1);
    expect(levelA).toEqual(levelB);

    const levelC = buildLevel(1, 15);
    const levelD = buildLevel(1, 15);
    expect(levelC).toEqual(levelD);
  });

  it('rejects invalid sizeIndex and level with RangeError', () => {
    expect(() => levelParams(-1, 1)).toThrow(RangeError);
    expect(() => levelParams(5, 1)).toThrow(RangeError);
    expect(() => levelParams(0, 0)).toThrow(RangeError);
    expect(() => levelParams(0, 201)).toThrow(RangeError);
    expect(() => levelParams(1.5, 1)).toThrow(RangeError);
    expect(() => levelParams(0, 10.5)).toThrow(RangeError);
  });

  it('difficulty constants match spec', () => {
    expect(DIFFICULTIES).toHaveLength(5);
    expect(DIFFICULTIES.map((d) => d.id)).toEqual([
      'tiny',
      'compact',
      'large',
      'vast',
      'massive',
    ]);
    expect(SIZES).toEqual([16, 24, 32, 48, 64]);
    expect(LEVELS_PER_SIZE).toBe(200);
    expect(SQUARE_LEVELS).toBe(10);
  });
});

describe.skipIf(!process.env.FULL)('full 1000 levels suite', () => {
  it(
    'all 1000 levels are valid, solvable and meet the quality bar',
    { timeout: 600_000 },
    () => {
      for (let s = 0; s < SIZES.length; s++) {
        for (let l = 1; l <= LEVELS_PER_SIZE; l++) {
          const level = buildLevel(s, l);
          expect(validateLevel(level)).toEqual([]);
          expect(isSolvable(level)).toBe(true);
          expect(emptyShare(level)).toBeLessThanOrEqual(0.03);
          expect(blockedShare(level)).toBeGreaterThanOrEqual(0.3);
          expect(meanLength(level)).toBeGreaterThanOrEqual(4.0);
        }
      }
    },
  );
});
