import { describe, expect, it } from 'vitest';
import { validateLevel } from './board';
import { generateLevel, type GenParams } from './generator';
import { blockedShare, emptyShare, meanLength } from './quality';
import { maskFor, SHAPES } from './shapes';
import { isSolvable } from './solver';

describe('generator', () => {
  const getShape = (id: string) => {
    const s = SHAPES.find((shape) => shape.id === id);
    if (!s) throw new Error(`shape ${id} not found`);
    return s;
  };

  const defaultParams = (
    size: number,
    shapeId: string,
    seed: number,
  ): GenParams => ({
    size,
    mask: maskFor(getShape(shapeId), size),
    seed,
    minLength: 3,
    maxLength: 8,
    bendChance: 0.5,
    longBias: 0.7,
    tangle: 0.8,
  });

  it('generateLevel output passes validateLevel and is solvable', () => {
    const sizes = [16, 24];
    const shapes = ['square', 'ring', 'heart'];
    const seeds = [1, 2, 3, 4, 5];

    for (const size of sizes) {
      for (const shape of shapes) {
        for (const seed of seeds) {
          const params = defaultParams(size, shape, seed);
          const level = generateLevel(params);
          const problems = validateLevel(level);
          expect(problems).toEqual([]);
          expect(isSolvable(level)).toBe(true);
        }
      }
    }
  });

  it('same params give the identical level', () => {
    const params = defaultParams(16, 'square', 42);
    const level1 = generateLevel(params);
    const level2 = generateLevel(params);
    expect(level1).toEqual(level2);
  });

  it('emptyShare is at most 0.03', () => {
    const sizes = [16, 24];
    const shapes = ['square', 'ring', 'heart'];
    const seeds = [10, 20];

    for (const size of sizes) {
      for (const shape of shapes) {
        for (const seed of seeds) {
          const level = generateLevel(defaultParams(size, shape, seed));
          expect(emptyShare(level)).toBeLessThanOrEqual(0.03);
        }
      }
    }
  });

  it('blockedShare is at least 0.30', () => {
    const sizes = [16, 24];
    const shapes = ['square', 'ring', 'heart'];
    const seeds = [10, 20];

    for (const size of sizes) {
      for (const shape of shapes) {
        for (const seed of seeds) {
          const level = generateLevel(defaultParams(size, shape, seed));
          expect(blockedShare(level)).toBeGreaterThanOrEqual(0.3);
        }
      }
    }
  });

  it('meanLength is at least 4', () => {
    const sizes = [16, 24];
    const shapes = ['square', 'ring', 'heart'];
    const seeds = [10, 20];

    for (const size of sizes) {
      for (const shape of shapes) {
        for (const seed of seeds) {
          const level = generateLevel(defaultParams(size, shape, seed));
          expect(meanLength(level)).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });

  it('a disconnected mask throws', () => {
    const size = 16;
    const mask = new Array<boolean>(size * size).fill(false);
    mask[0] = true;
    mask[size * size - 1] = true;

    expect(() =>
      generateLevel({
        size,
        mask,
        seed: 1,
        minLength: 3,
        maxLength: 8,
        bendChance: 0.5,
        longBias: 0.7,
        tangle: 0.8,
      }),
    ).toThrow();
  });
});
