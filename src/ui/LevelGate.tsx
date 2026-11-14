import { useEffect, useState, type ReactNode } from 'react';
import { DIFFICULTIES, LEVELS_PER_SIZE } from '../core/difficulty';
import type { Level } from '../core/types';
import { loadLevel, prefetchLevel } from '../game/levelLoader';
import { Loading } from './Loading';

interface Props {
  readonly difficulty: number;
  readonly level: number;
  readonly children: (board: Level) => ReactNode;
}

/**
 * Builds the level off the main thread, with a loading screen up meanwhile, and then
 * gets the next level ready in the background so Next is quick.
 */
export function LevelGate({ difficulty, level, children }: Props) {
  const [loaded, setLoaded] = useState<{
    key: string;
    board: Level;
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const targetKey = `${difficulty}:${level}`;

  useEffect(() => {
    let live = true;
    void loadLevel(difficulty, level)
      .then((b) => {
        if (live) setLoaded({ key: targetKey, board: b });
      })
      .catch(() => {
        if (live) setFailedKey(targetKey);
      });
    return () => {
      live = false;
    };
  }, [difficulty, level, targetKey, attempt]);

  const board = loaded?.key === targetKey ? loaded.board : null;

  useEffect(() => {
    if (!board || level >= LEVELS_PER_SIZE) return;
    // Wait for the board to draw first, so the two builds do not compete.
    const id = window.setTimeout(
      () => prefetchLevel(difficulty, level + 1),
      1500,
    );
    return () => window.clearTimeout(id);
  }, [board, difficulty, level]);

  if (!board && failedKey === targetKey) {
    return (
      <main
        role="alert"
        className="grid h-dvh place-items-center bg-slate-950 p-6 text-center text-slate-200"
      >
        <div className="max-w-sm rounded-3xl p-8 hud-card">
          <h1 className="text-2xl font-black text-strong">
            Could not build this level
          </h1>
          <p className="mt-2 text-slate-300">
            Your progress is saved. Try again, or go back and pick another
            level.
          </p>
          <button
            type="button"
            onClick={() => {
              setFailedKey(null);
              setAttempt((n) => n + 1);
            }}
            className="mt-6 w-full rounded-2xl bg-teal-300 py-3 font-bold text-ink active:scale-97"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!board) {
    const spec = DIFFICULTIES[difficulty];
    return (
      <Loading
        label="Building level"
        detail={`${spec?.name ?? 'Level'} · Level ${level}`}
      />
    );
  }
  return <>{children(board)}</>;
}
