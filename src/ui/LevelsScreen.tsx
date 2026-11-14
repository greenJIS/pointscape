import { useEffect, useRef } from 'react';
import {
  DIFFICULTIES,
  LEVELS_PER_SIZE,
  UNLOCK_AFTER,
} from '../core/difficulty';
import {
  clearedCount,
  isCleared,
  isSizeUnlocked,
  isUnlocked,
  nextLevel,
  opens,
  prerequisite,
  type Progress,
} from '../game/progress';
import { accentFor } from './accents';
import { Check, Lock } from './icons';
import { Page } from './Page';

interface Props {
  readonly difficulty: number;
  readonly progress: Progress;
  readonly unlockAll: boolean;
  readonly onPickDifficulty: (difficulty: number) => void;
  readonly onPlay: (difficulty: number, level: number) => void;
  readonly onLocked: (message: string) => void;
  readonly onBack: () => void;
}

export function LevelsScreen({
  difficulty,
  progress,
  unlockAll,
  onPickDifficulty,
  onPlay,
  onLocked,
  onBack,
}: Props) {
  const accent = accentFor(difficulty);
  const done = clearedCount(progress, difficulty);
  const current = nextLevel(progress, difficulty);
  const openedSizes = opens(difficulty);
  const targetDiffIndex = openedSizes[0];
  const targetDiffName =
    targetDiffIndex !== undefined ? DIFFICULTIES[targetDiffIndex]?.name : null;
  const currentRef = useRef<HTMLButtonElement | null>(null);

  // Bring the current level into view, so nobody scrolls past cleared ones.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, [difficulty]);

  const pick = (d: number) => {
    if (isSizeUnlocked(d, progress, unlockAll)) {
      onPickDifficulty(d);
      return;
    }
    const need = prerequisite(d);
    const needName = need !== null ? (DIFFICULTIES[need]?.name ?? '') : '';
    const prereqDone = need !== null ? clearedCount(progress, need) : 0;
    onLocked(
      need !== null
        ? `Clear ${UNLOCK_AFTER} ${needName} levels to unlock (${prereqDone}/${UNLOCK_AFTER})`
        : 'Locked',
    );
  };

  const tab = (d: number, label: string, active: boolean) => {
    const open = isSizeUnlocked(d, progress, unlockAll);
    return (
      <button
        key={label}
        type="button"
        onClick={() => pick(d)}
        aria-label={open ? undefined : `${label}, locked`}
        aria-pressed={active}
        className={`grid min-h-11 flex-1 place-items-center rounded-lg border text-sm font-bold transition-colors ${
          active
            ? `${accentFor(d).bg} border-transparent text-ink`
            : open
              ? 'border-slate-600 bg-slate-800 text-slate-300'
              : 'border-slate-700 bg-slate-900 text-slate-500'
        }`}
      >
        {open ? label : <Lock className="size-4" />}
      </button>
    );
  };

  return (
    <Page
      title={DIFFICULTIES[difficulty]?.name ?? 'Levels'}
      onBack={onBack}
      width="max-w-5xl"
      top={
        <>
          <div className="flex flex-col gap-2 lg:max-w-md">
            <div className="flex gap-2" role="group" aria-label="Difficulty">
              {DIFFICULTIES.map((d, i) => tab(i, d.name, i === difficulty))}
            </div>
          </div>

          <div className="rounded-2xl p-3 text-sm hud-card">
            {targetDiffIndex !== undefined && targetDiffName ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-300">
                    {isSizeUnlocked(targetDiffIndex, progress, false)
                      ? `Unlocked: ${targetDiffName}`
                      : `Unlocks ${targetDiffName}`}
                  </span>
                  <span className="text-slate-400">
                    {`${Math.min(done, UNLOCK_AFTER)} / ${UNLOCK_AFTER}`}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full border border-slate-600 bg-slate-800">
                  <div
                    className={`h-full rounded-full ${accent.bg}`}
                    style={{
                      width: `${(Math.min(done, UNLOCK_AFTER) / UNLOCK_AFTER) * 100}%`,
                    }}
                  />
                </div>
              </>
            ) : (
              <span className="text-slate-300">Final size</span>
            )}
          </div>
        </>
      }
    >
      <ol className="grid auto-rows-min grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {Array.from({ length: LEVELS_PER_SIZE }, (_, k) => k + 1).map((l) => {
          const open = isUnlocked(difficulty, l, progress, unlockAll);
          const cleared = isCleared(progress, difficulty, l);
          const isCurrent = l === current;
          const tone = cleared
            ? `border-2 border-transparent ${accent.bg} text-ink`
            : open
              ? `border-2 ${accent.border} bg-slate-800 text-strong`
              : 'border-2 border-slate-700 bg-slate-900 text-slate-500';
          return (
            <li key={l}>
              <button
                type="button"
                ref={isCurrent ? currentRef : undefined}
                disabled={!open}
                onClick={() => onPlay(difficulty, l)}
                aria-label={`Level ${l}${cleared ? ', cleared' : open ? '' : ', locked'}`}
                className={`grid aspect-square w-full place-items-center rounded-xl text-sm font-bold ${tone} ${isCurrent ? 'ring-2 ring-strong/60' : ''}`}
              >
                {cleared ? (
                  <Check className="size-5" />
                ) : open ? (
                  l
                ) : (
                  <Lock className="size-4" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </Page>
  );
}
