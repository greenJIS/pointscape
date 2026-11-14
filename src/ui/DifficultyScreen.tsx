import {
  DIFFICULTIES,
  LEVELS_PER_SIZE,
  SIZES,
  UNLOCK_AFTER,
} from '../core/difficulty';
import {
  clearedCount,
  isSizeUnlocked,
  prerequisite,
  totalCleared,
  type Progress,
} from '../game/progress';
import { accentFor } from './accents';
import { Lock } from './icons';
import { Page } from './Page';

interface Props {
  readonly progress: Progress;
  readonly unlockAll: boolean;
  readonly onPick: (difficulty: number) => void;
  readonly onLocked: (message: string) => void;
  readonly onBack: () => void;
}

/** 5 size rows: Tiny 16x16, Compact 24x24, Large 32x32, Vast 48x48, Massive 64x64. */
export function DifficultyScreen({
  progress,
  unlockAll,
  onPick,
  onLocked,
  onBack,
}: Props) {
  return (
    <Page
      title="Choose a size"
      onBack={onBack}
      footer={
        <p className="mx-auto rounded-full px-4 py-2 text-sm font-bold hud-card text-slate-300">
          {`${totalCleared(progress)} of ${SIZES.length * LEVELS_PER_SIZE} levels cleared`}
        </p>
      }
      top={
        <p className="max-w-prose text-base text-slate-300">
          Clear {UNLOCK_AFTER} levels in each size to unlock the next.
        </p>
      }
    >
      <ul className="flex flex-col gap-4">
        {DIFFICULTIES.map((d, i) => {
          const accent = accentFor(i);
          const size = SIZES[i] ?? 16;
          const open = isSizeUnlocked(i, progress, unlockAll);
          const need = prerequisite(i);
          const cleared = clearedCount(progress, i);
          const needName =
            need !== null ? (DIFFICULTIES[need]?.name ?? '') : '';
          const prereqCleared =
            need !== null ? clearedCount(progress, need) : 0;

          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => {
                  if (open) {
                    onPick(i);
                  } else {
                    onLocked(
                      need !== null
                        ? `Clear ${UNLOCK_AFTER} ${needName} levels to unlock (${prereqCleared}/${UNLOCK_AFTER})`
                        : 'Locked',
                    );
                  }
                }}
                className={`flex w-full flex-col gap-3 rounded-3xl p-5 text-left hud-card transition-transform active:scale-99 ${
                  open ? '' : 'opacity-85'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`size-3 rounded-full ring-1 ring-slate-500 ${accent.bg}`}
                    />
                    <h2 className="text-2xl font-extrabold text-strong">
                      {d.name}
                    </h2>
                    <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-300">
                      {`${size}×${size}`}
                    </span>
                  </div>

                  {open ? (
                    <span className="text-sm font-bold text-slate-300">
                      {`${cleared} / ${LEVELS_PER_SIZE} cleared`}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-lock">
                      <Lock className="size-4" />
                      <span>
                        {`${prereqCleared} / ${UNLOCK_AFTER} to unlock`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full border border-slate-600 bg-slate-800">
                  {open ? (
                    <div
                      className={`h-full rounded-full ${accent.bg} transition-all duration-300`}
                      style={{
                        width: `${(cleared / LEVELS_PER_SIZE) * 100}%`,
                      }}
                    />
                  ) : (
                    <div
                      className="h-full rounded-full bg-lock transition-all duration-300"
                      style={{
                        width: `${(Math.min(prereqCleared, UNLOCK_AFTER) / UNLOCK_AFTER) * 100}%`,
                      }}
                    />
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
