import { buildLevel, buildSafeLevel } from '../core/levels';
import type { Level } from '../core/types';
import type { LevelReply, LevelRequest } from './levelWorker';

export type { LevelReply, LevelRequest } from './levelWorker';

export type LevelBuilder = (
  sizeIndex: number,
  level: number,
  seed?: number,
) => Level;

const cache = new Map<string, Promise<Level>>();
const waiting = new Map<number, (board: Level | null) => void>();
let worker: Worker | null | undefined;
let nextId = 1;
let customBuilder: LevelBuilder | null = null;

const keyOf = (sizeIndex: number, level: number): string =>
  `${sizeIndex}:${level}`;

export function setLevelBuilder(builder: LevelBuilder | null): void {
  customBuilder = builder;
}

/** One shared worker, or null where workers are missing or fail to start. */
function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  if (typeof Worker === 'undefined') return worker;
  try {
    const w = new Worker(new URL('./levelWorker.ts', import.meta.url), {
      type: 'module',
    });
    w.onmessage = (e: MessageEvent<LevelReply>) => {
      const done = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      done?.(e.data.board);
    };
    w.onerror = () => {
      // Give every waiting caller the main-thread fallback, and stop using the worker.
      worker = null;
      w.terminate();
      for (const done of waiting.values()) done(null);
      waiting.clear();
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

export function resetLevelWorker(): void {
  if (worker) {
    worker.terminate();
  }
  worker = undefined;
  waiting.clear();
}

/** Without a worker, let the page paint first, then build on the main thread. */
const buildLater = (
  sizeIndex: number,
  level: number,
  builder: LevelBuilder,
): Promise<Level> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(buildSafeLevel(sizeIndex, level, builder));
      } catch (err) {
        reject(err);
      }
    }, 0);
  });

function build(
  sizeIndex: number,
  level: number,
  builder?: LevelBuilder,
): Promise<Level> {
  const activeBuilder = builder ?? customBuilder ?? buildLevel;
  const w =
    builder !== undefined || customBuilder !== null ? null : getWorker();
  if (!w) return buildLater(sizeIndex, level, activeBuilder);
  return new Promise((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, (board) => {
      if (board) {
        resolve(board);
      } else {
        try {
          resolve(buildSafeLevel(sizeIndex, level, activeBuilder));
        } catch (err) {
          reject(err);
        }
      }
    });
    const req: LevelRequest = { id, sizeIndex, level };
    w.postMessage(req);
  });
}

/**
 * The level, built once. Levels are seeded, so a retry or a revisit gets the cached copy.
 * Resolves on a later turn, so the caller can show a loading screen first.
 */
export function loadLevel(
  sizeIndex: number,
  level: number,
  builder?: LevelBuilder,
): Promise<Level> {
  const key = keyOf(sizeIndex, level);
  let found = cache.get(key);
  if (!found) {
    const built = build(sizeIndex, level, builder);
    // A failed build must not stay cached, or a retry would get the same failure.
    built.catch(() => {
      if (cache.get(key) === built) cache.delete(key);
    });
    found = built;
    cache.set(key, found);
  }
  return found;
}

/** Start building a level that is likely to be asked for next. */
export function prefetchLevel(
  sizeIndex: number,
  level: number,
  builder?: LevelBuilder,
): void {
  void loadLevel(sizeIndex, level, builder).catch(() => {});
}

/** Drop every cached level. Used by tests. */
export function clearLevelCache(): void {
  cache.clear();
}
