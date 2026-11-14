import { DIFFICULTIES, LEVELS_PER_SIZE } from '../core/difficulty';
import type { Progress } from '../game/progress';
import { totalCleared } from '../game/progress';
import { Grid, HelpIcon, Play, SettingsIcon, Star, Bulb } from './icons';
import { Logo } from './Logo';
import { Stage } from './Stage';

interface Props {
  readonly dark: boolean;
  readonly name: string;
  readonly progress: Progress;
  readonly onPlay: () => void;
  readonly onAllLevels: () => void;
  readonly onSettings: () => void;
  readonly onHelp: () => void;
}

export function HomeScreen({
  dark,
  name,
  progress,
  onPlay,
  onAllLevels,
  onSettings,
  onHelp,
}: Props) {
  const { difficulty, level } = progress.last;
  const cleared = totalCleared(progress);
  const total = DIFFICULTIES.length * LEVELS_PER_SIZE;
  const currentDiffName = DIFFICULTIES[difficulty]?.name ?? 'Tiny';

  return (
    <Stage dark={dark}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-full py-1 pr-4 pl-1 hud-card sm:top-6 sm:left-6">
        <span
          aria-hidden="true"
          className="grid size-11 place-items-center rounded-full bg-night font-bold text-link"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="font-semibold">{`Hi, ${name}`}</span>
      </div>
      <div className="absolute top-4 right-4 z-10 flex gap-2 sm:top-6 sm:right-6">
        <button
          type="button"
          onClick={onHelp}
          aria-label="How to play"
          className="grid size-11 place-items-center rounded-full text-lg font-bold hud-card"
        >
          <HelpIcon />
        </button>
        <button
          type="button"
          onClick={onSettings}
          aria-label="Settings"
          className="grid size-11 place-items-center rounded-full text-lg hud-card"
        >
          <SettingsIcon />
        </button>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <Logo className="text-4xl sm:text-5xl sm:[@media(min-height:700px)]:text-7xl lg:[@media(min-height:700px)]:text-8xl" />
        <p className="mt-6 rounded-full px-5 py-2 text-lg font-semibold hud-card">
          Tap arrows. Clear the board.
        </p>
        <button
          type="button"
          onClick={onPlay}
          className="mt-6 w-full max-w-xs rounded-3xl bg-teal-300 px-8 py-4 text-xl font-black text-ink shadow-[0_3px_0_var(--color-teal-700)] active:scale-97 lg:max-w-md"
        >
          <span className="flex items-center justify-center gap-2">
            <Play className="size-6" />
            {cleared > 0 ? 'Continue' : 'Play'}
          </span>
          <span className="block text-sm font-bold opacity-70">
            {`${currentDiffName} · Level ${level}`}
          </span>
        </button>
        <button
          type="button"
          onClick={onAllLevels}
          className="mt-4 w-full max-w-xs rounded-2xl py-3 font-bold hud-card active:scale-97 lg:max-w-md"
        >
          <span className="flex items-center justify-center gap-2">
            <Grid className="size-5" />
            All levels
          </span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] flex flex-wrap items-center justify-center gap-2 px-4 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold hud-card">
          <Star className="size-4.5 text-link" />
          {cleared.toLocaleString()}
          <span className="font-normal opacity-80">
            {`of ${total.toLocaleString()} cleared`}
          </span>
        </p>
        <p className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold hud-card">
          <Bulb className="size-4.5 text-link" />
          {progress.hints}
          <span className="font-normal opacity-80">hints</span>
        </p>
      </div>
    </Stage>
  );
}
