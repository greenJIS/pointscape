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
  const targetKey = `${difficulty}:${level}`;

  useEffect(() => {
    let live = true;
    void loadLevel(difficulty, level)
      .then((b) => {
        if (live) setLoaded({ key: targetKey, board: b });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [difficulty, level, targetKey]);

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
