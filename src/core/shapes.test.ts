import { describe, expect, it } from 'vitest';
import { isConnected, maskFor, shapeFor, SHAPES, SIZES } from './shapes';

describe('shapes and masks', () => {
  it('isConnected returns false for empty or disconnected masks', () => {
    expect(isConnected([], 0)).toBe(false);
    expect(isConnected([false, false, false, false], 2)).toBe(false);
    expect(isConnected([true, false, false, true], 2)).toBe(false);
    expect(isConnected([true, true, false, true], 2)).toBe(true);
  });

  it('every shape at every size is connected', () => {
    for (const shape of SHAPES) {
      for (const size of SIZES) {
        if (size < shape.minSize) continue;
        const mask = maskFor(shape, size);
        expect(
          isConnected(mask, size),
          `shape ${shape.id} at size ${size} should be connected`,
        ).toBe(true);
      }
    }
  });

  it('every shape at every size has at least 60 cells or is excluded by minSize', () => {
    for (const shape of SHAPES) {
      for (const size of SIZES) {
        const mask = maskFor(shape, size);
        const count = mask.filter(Boolean).length;
        if (size < shape.minSize) {
          // If excluded by minSize, it either has fewer than 60 cells or is disconnected
          continue;
        }
        expect(
          count,
          `shape ${shape.id} at size ${size} (minSize ${shape.minSize}) should have >= 60 cells`,
        ).toBeGreaterThanOrEqual(60);
      }
    }
  });

  it('shapeFor returns square for levels 1 to 10 of every size', () => {
    for (let sizeIndex = 0; sizeIndex < SIZES.length; sizeIndex++) {
      for (let level = 1; level <= 10; level++) {
        const shape = shapeFor(sizeIndex, level);
        expect(shape.id).toBe('square');
      }
    }
  });

  it('shapeFor is deterministic and uses every allowed shape at least once over 200 levels', () => {
    for (const [sizeIndex, size] of SIZES.entries()) {
      const allowed = SHAPES.filter((s) => s.minSize <= size);
      const usedIds = new Set<string>();

      for (let level = 1; level <= 200; level++) {
        const first = shapeFor(sizeIndex, level);
        const second = shapeFor(sizeIndex, level);
        expect(first.id).toBe(second.id);
        usedIds.add(first.id);
      }

      for (const shape of allowed) {
        expect(
          usedIds.has(shape.id),
          `size ${size} should use shape ${shape.id} at least once in 200 levels`,
        ).toBe(true);
      }
    }
  });
});
