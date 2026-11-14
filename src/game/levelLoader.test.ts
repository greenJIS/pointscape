import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildLevel, seedFor } from '../core/levels';
import type { Level } from '../core/types';
import { LEFT, RIGHT, v } from '../core/vec';
import {
  clearLevelCache,
  loadLevel,
  prefetchLevel,
  resetLevelWorker,
  setLevelBuilder,
} from './levelLoader';
import type { LevelReply, LevelRequest } from './levelWorker';

describe('levelLoader', () => {
  beforeEach(() => {
    clearLevelCache();
    setLevelBuilder(null);
    resetLevelWorker();
  });

  afterEach(() => {
    clearLevelCache();
    setLevelBuilder(null);
    resetLevelWorker();
  });

  it('gives the same level as buildLevel', async () => {
    const loaded = await loadLevel(0, 1);
    expect(loaded).toEqual(buildLevel(0, 1));
  });

  it('loadLevel caches by size and level', async () => {
    const a = loadLevel(0, 1);
    const b = loadLevel(0, 1);
    const c = loadLevel(0, 2);
    const d = loadLevel(1, 1);

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);

    expect(await a).toBe(await b);
    expect(await a).not.toBe(await c);
  });

  it('does not block the caller: the promise is still pending right after the call', async () => {
    let settled = false;
    const p = loadLevel(0, 3).then(() => {
      settled = true;
    });
    expect(settled).toBe(false);
    await p;
    expect(settled).toBe(true);
  });

  it('a level that fails the solver is replaced by the next seed', async () => {
    const seeds: number[] = [];
    const baseSeed = seedFor(0, 1);

    // Two arrows that face each other: valid arrow definitions, but unsolvable.
    const stuckLevel: Level = {
      size: 16,
      mask: Array(256).fill(true),
      arrows: [
        { id: 1, cells: [v(1, 0), v(2, 0)], dir: RIGHT },
        { id: 2, cells: [v(4, 0), v(3, 0)], dir: LEFT },
      ],
    };

    setLevelBuilder((sizeIndex, level, seed) => {
      const currentSeed = seed ?? seedFor(sizeIndex, level);
      seeds.push(currentSeed);
      if (currentSeed === baseSeed) {
        return stuckLevel;
      }
      return buildLevel(sizeIndex, level, seed);
    });

    const level = await loadLevel(0, 1);
    expect(seeds).toEqual([baseSeed, baseSeed + 1]);
    expect(level).toEqual(buildLevel(0, 1, baseSeed + 1));
  });

  it('a level that fails validation is replaced by the next seed', async () => {
    const seeds: number[] = [];
    const baseSeed = seedFor(0, 2);

    // Arrow with fewer than 2 cells fails validateLevel.
    const invalidLevel: Level = {
      size: 16,
      mask: Array(256).fill(true),
      arrows: [{ id: 1, cells: [v(0, 0)], dir: RIGHT }],
    };

    setLevelBuilder((sizeIndex, level, seed) => {
      const currentSeed = seed ?? seedFor(sizeIndex, level);
      seeds.push(currentSeed);
      if (currentSeed === baseSeed) {
        return invalidLevel;
      }
      return buildLevel(sizeIndex, level, seed);
    });

    const level = await loadLevel(0, 2);
    expect(seeds).toEqual([baseSeed, baseSeed + 1]);
    expect(level).toEqual(buildLevel(0, 2, baseSeed + 1));
  });

  it('a builder that throws is replaced by the next seed', async () => {
    const seeds: number[] = [];
    const baseSeed = seedFor(0, 3);

    setLevelBuilder((sizeIndex, level, seed) => {
      const currentSeed = seed ?? seedFor(sizeIndex, level);
      seeds.push(currentSeed);
      if (currentSeed === baseSeed) {
        throw new Error('generator fault');
      }
      return buildLevel(sizeIndex, level, seed);
    });

    const level = await loadLevel(0, 3);
    expect(seeds).toEqual([baseSeed, baseSeed + 1]);
    expect(level).toEqual(buildLevel(0, 3, baseSeed + 1));
  });

  it('throws if builder repeatedly fails', async () => {
    // Arrow with fewer than 2 cells fails validateLevel on every attempt.
    const invalidLevel: Level = {
      size: 16,
      mask: Array(256).fill(true),
      arrows: [{ id: 1, cells: [v(0, 0)], dir: RIGHT }],
    };
    setLevelBuilder(() => invalidLevel);
    await expect(loadLevel(0, 1)).rejects.toThrow(/Failed to generate/);
  });

  it('rejects invalid sizeIndex or level with RangeError', async () => {
    await expect(loadLevel(-1, 1)).rejects.toThrow(RangeError);
    await expect(loadLevel(0, 0)).rejects.toThrow(RangeError);
  });

  it('prefetchLevel starts loading into cache', async () => {
    prefetchLevel(0, 4);
    const loaded = await loadLevel(0, 4);
    expect(loaded).toEqual(buildLevel(0, 4));
  });

  it('clearLevelCache empties the cache', async () => {
    const a = loadLevel(0, 5);
    clearLevelCache();
    const b = loadLevel(0, 5);
    expect(a).not.toBe(b);
    expect(await a).toEqual(await b);
  });

  it('uses Worker when available', async () => {
    class MockWorker {
      onmessage: ((e: MessageEvent<LevelReply>) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      postMessage(req: LevelRequest) {
        setTimeout(() => {
          this.onmessage?.({
            data: { id: req.id, board: buildLevel(req.sizeIndex, req.level) },
          } as MessageEvent<LevelReply>);
        }, 0);
      }
      terminate() {}
    }

    const origWorker = globalThis.Worker;
    // @ts-expect-error mock worker assignment for test
    globalThis.Worker = MockWorker;
    try {
      resetLevelWorker();
      const level = await loadLevel(0, 6);
      expect(level).toEqual(buildLevel(0, 6));
    } finally {
      globalThis.Worker = origWorker;
      resetLevelWorker();
    }
  });

  it('falls back to main thread when worker errors', async () => {
    class FailingWorker {
      onmessage: ((e: MessageEvent<LevelReply>) => void) | null = null;
      onerror: ((e: Event) => void) | null = null;
      postMessage() {
        setTimeout(() => {
          this.onerror?.(new Event('error'));
        }, 0);
      }
      terminate() {}
    }

    const origWorker = globalThis.Worker;
    // @ts-expect-error mock worker assignment for test
    globalThis.Worker = FailingWorker;
    try {
      resetLevelWorker();
      const level = await loadLevel(0, 7);
      expect(level).toEqual(buildLevel(0, 7));
    } finally {
      globalThis.Worker = origWorker;
      resetLevelWorker();
    }
  });

  it('a failed build is not cached, so a retry builds again', async () => {
    let calls = 0;
    setLevelBuilder(() => {
      calls += 1;
      // buildSafeLevel makes 100 attempts before it gives up.
      if (calls <= 100) throw new Error('boom');
      return buildLevel(0, 1);
    });
    await expect(loadLevel(0, 1)).rejects.toThrow();
    await expect(loadLevel(0, 1)).resolves.toBeDefined();
  });
});
