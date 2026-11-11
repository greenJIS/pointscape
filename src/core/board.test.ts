import { describe, expect, it } from 'vitest';
import { blockerOf, exitRay, inMask, isFree, validateLevel } from './board';
import type { Arrow, Level } from './types';
import { DOWN, RIGHT, UP, v } from './vec';

const arrow = (id: number, cells: [number, number][], dir = RIGHT): Arrow => ({
  id,
  cells: cells.map(([x, y]) => v(x, y)),
  dir,
});

const level = (
  arrows: Arrow[],
  size = 5,
  mask?: readonly boolean[],
): Level => ({
  size,
  mask: mask ?? Array(size * size).fill(true),
  arrows,
});

describe('inMask', () => {
  it('returns true for a cell inside the mask', () => {
    const l = level([], 3);
    expect(inMask(l, v(1, 1))).toBe(true);
  });

  it('returns false for a cell outside the mask or bounds', () => {
    const mask = [true, false, true, true, true, true, true, true, true];
    const l = level([], 3, mask);
    expect(inMask(l, v(1, 0))).toBe(false);
    expect(inMask(l, v(-1, 0))).toBe(false);
    expect(inMask(l, v(3, 0))).toBe(false);
  });
});

describe('exit ray', () => {
  it('runs from past the head to the board edge', () => {
    const a = arrow(0, [
      [0, 0],
      [1, 0],
    ]);
    expect(exitRay(level([a]), a)).toEqual([v(2, 0), v(3, 0), v(4, 0)]);
  });

  it('is empty when the head is on the edge', () => {
    const a = arrow(0, [
      [3, 0],
      [4, 0],
    ]);
    expect(exitRay(level([a]), a)).toEqual([]);
  });

  it('exit ray crosses a mask hole and is blocked by an arrow on the far side', () => {
    // 5x5 board. Row 1 has hole at (2, 1).
    // Arrow 1 at (0, 1)-(1, 1) points RIGHT.
    // Arrow 2 at (3, 1)-(4, 1) points UP.
    const mask = Array(25).fill(true);
    mask[1 * 5 + 2] = false; // hole at (2, 1)
    const a = arrow(
      1,
      [
        [0, 1],
        [1, 1],
      ],
      RIGHT,
    );
    const b = arrow(
      2,
      [
        [3, 1],
        [4, 1],
      ],
      UP,
    );
    const l = level([a, b], 5, mask);

    const ray = exitRay(l, a);
    expect(ray).toEqual([v(2, 1), v(3, 1), v(4, 1)]);
    expect(inMask(l, v(2, 1))).toBe(false);

    const blocker = blockerOf(l, a);
    expect(blocker).toBe(b);
    expect(isFree(l, a)).toBe(false);
  });

  it('exit ray over a hole with nothing beyond is free', () => {
    // 5x5 board. Row 1 has hole at (2, 1) and cells (3, 1), (4, 1) are clear.
    const mask = Array(25).fill(true);
    mask[1 * 5 + 2] = false; // hole at (2, 1)
    const a = arrow(
      1,
      [
        [0, 1],
        [1, 1],
      ],
      RIGHT,
    );
    const l = level([a], 5, mask);

    expect(blockerOf(l, a)).toBeUndefined();
    expect(isFree(l, a)).toBe(true);
  });
});

describe('free and blocked', () => {
  const a = arrow(0, [
    [0, 0],
    [1, 0],
  ]);
  const b = arrow(
    1,
    [
      [3, 1],
      [3, 0],
    ],
    UP,
  );

  it('an arrow with a clear ray is free', () => {
    expect(isFree(level([a]), a)).toBe(true);
  });

  it('names the arrow that blocks the ray', () => {
    const l = level([a, b]);
    expect(blockerOf(l, a)).toBe(b);
    expect(blockerOf(l, a)?.id).toBe(1);
  });

  it('frees an arrow once its blocker leaves', () => {
    expect(isFree(level([a, b]), a)).toBe(false);
    expect(isFree(level([a, b]), b)).toBe(true);
    expect(isFree(level([a]), a)).toBe(true);
  });
});

describe('validateLevel', () => {
  it('accepts a good level', () => {
    const a = arrow(0, [
      [0, 0],
      [1, 0],
    ]);
    expect(validateLevel(level([a]))).toEqual([]);
  });

  it('rejects arrow cell outside mask', () => {
    const mask = [true, false, true, true, true, true, true, true, true];
    const a = arrow(0, [
      [0, 0],
      [1, 0],
    ]);
    const l = level([a], 3, mask);
    const problems = validateLevel(l);
    expect(problems.some((p) => p.includes('outside mask'))).toBe(true);
  });

  it('rejects overlapping arrows', () => {
    const a = arrow(0, [
      [0, 0],
      [1, 0],
    ]);
    const b = arrow(
      1,
      [
        [1, 0],
        [1, 1],
      ],
      DOWN,
    );
    const problems = validateLevel(level([a, b]));
    expect(problems.some((p) => p.includes('overlap'))).toBe(true);
  });

  it('rejects non-adjacent consecutive cells', () => {
    const a = arrow(0, [
      [0, 0],
      [2, 0],
    ]);
    const problems = validateLevel(level([a]));
    expect(
      problems.some((p) => p.includes('non-adjacent') || p.includes('gap')),
    ).toBe(true);
  });

  it('rejects dir not equal to last segment direction', () => {
    // Last segment is (0, 0) -> (1, 0), so last segment dir is RIGHT.
    // But arrow dir is set to DOWN.
    const a = arrow(
      0,
      [
        [0, 0],
        [1, 0],
      ],
      DOWN,
    );
    const problems = validateLevel(level([a]));
    expect(
      problems.some((p) => p.includes('dir') || p.includes('direction')),
    ).toBe(true);
  });

  it('validateLevel rejects own body on exit ray', () => {
    // Arrow bends in a loop so its head points at its own tail.
    // Tail at (3, 0), runs down and around to (2, 0) pointing RIGHT at (3, 0).
    const a = arrow(
      0,
      [
        [3, 0],
        [3, 1],
        [3, 2],
        [2, 2],
        [1, 2],
        [1, 1],
        [1, 0],
        [2, 0],
      ],
      RIGHT,
    );
    const problems = validateLevel(level([a]));
    expect(
      problems.some(
        (p) => p.includes('own body on exit ray') || p.includes('itself'),
      ),
    ).toBe(true);
  });

  it('rejects arrow with fewer than 2 cells', () => {
    const a = arrow(0, [[0, 0]]);
    const problems = validateLevel(level([a]));
    expect(problems.length).toBeGreaterThan(0);
  });
});
