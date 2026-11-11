import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DIFFICULTIES,
  LEVELS_PER_SIZE,
  UNLOCK_AFTER,
} from '../core/difficulty';
import type { Arrow, Level } from '../core/types';
import { HINT_GIFT_EVERY, type ClearResult } from '../game/progress';
import {
  arrowsLeft,
  hintFor,
  livesFor,
  restart,
  startSession,
  tap,
  type Session,
} from '../game/session';
import {
  ARROW_SPEED_RATE,
  type ArrowSpeed,
  type ColorMode,
  type ThemeMode,
} from '../game/settings';
import { BoardCanvas, type BoardCanvasHandle } from '../view/BoardCanvas';
import { ANIM, finishDistance, slideDistance } from '../view/motion';
import { arrowColors } from '../view/palette';
import { playSound } from '../view/sound';
import { accentFor } from './accents';
import { CoachMark } from './CoachMark';
import { PauseIcon } from './icons';
import { Modal, ModalButton } from './Modal';

export interface GameScreenProps {
  /** The built level. `LevelGate` builds it off the main thread. */
  readonly board: Level;
  readonly difficulty: number;
  readonly level: number;
  readonly hints: number;
  readonly theme?: ThemeMode;
  readonly dark?: boolean;
  readonly colorMode?: ColorMode;
  /** The colour picked in Settings for one-color mode. */
  readonly oneColor?: string;
  readonly sound?: boolean;
  readonly arrowSpeed?: ArrowSpeed;
  readonly showDots?: boolean;
  /** Clears so far in this difficulty/size, for the unlock progress line. */
  readonly clearedInTrack?: number;
  readonly clearedInDifficulty?: number;
  /** Difficulties/tracks that clearing UNLOCK_AFTER levels here opens, and that are still locked. */
  readonly pendingTracks?: readonly (number | { difficulty: number })[];
  readonly pendingDifficulties?: readonly number[];
  readonly onHintUsed: () => void;
  /** Called once when the level is won. Returns what the clear earned. */
  readonly onWin: () => ClearResult;
  readonly onNext?: () => void;
  readonly onLevels?: () => void;
  /** First-time card on Tiny 1 (FR coach mark). */
  readonly showCoach?: boolean;
  readonly onCoachDone?: () => void;
  readonly onSettings?: () => void;
  readonly onHelp?: () => void;
  readonly onHome?: () => void;
  readonly onExit?: () => void;
  readonly onNavigate?: (screen: string) => void;
  /** Shows a short message at the top of the screen. */
  readonly onToast?: (message: string) => void;
  readonly name?: string;
}

/** Seconds the last arrow takes to slide off the board. */
function slideSeconds(
  board: Level,
  arrow: Arrow | undefined,
  rate: number,
): number {
  if (!arrow) return 0;
  const finish = finishDistance(board, arrow);
  let t = 0;
  while (slideDistance(t, rate) < finish) t += 0.01;
  return t;
}

export function GameScreen({
  board,
  difficulty,
  level,
  hints,
  theme,
  dark,
  colorMode = 'multi',
  oneColor: chosenColor = '#00f5d0',
  sound = true,
  arrowSpeed = 'normal',
  showDots = false,
  clearedInTrack,
  clearedInDifficulty,
  pendingTracks,
  pendingDifficulties,
  onHintUsed,
  onWin,
  onNext,
  onLevels,
  showCoach = false,
  onCoachDone,
  onSettings,
  onHelp,
  onHome,
  onExit,
  onNavigate,
  onToast,
  name = 'Player',
}: GameScreenProps) {
  const [session, setSession] = useState<Session>(() =>
    startSession(board, livesFor(difficulty)),
  );
  const [hintId, setHintId] = useState<number | null>(null);
  const [winShown, setWinShown] = useState(false);
  const [loseShown, setLoseShown] = useState(false);
  const [paused, setPaused] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [result, setResult] = useState<ClearResult | null>(null);
  const reported = useRef(false);

  // Latest session, readable by a tap that lands before React re-renders.
  const live = useRef(session);
  const boardCanvasRef = useRef<BoardCanvasHandle>(null);

  // Pending timeouts, cleared on Restart and unmount so a late one never hits a new game.
  const timers = useRef(new Set<number>());
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const slideRate = ARROW_SPEED_RATE[arrowSpeed] ?? 1;
  const accent = accentFor(difficulty);
  const activeTheme: ThemeMode = theme ?? (dark ? 'dark' : 'light');
  const colors = useMemo(
    () =>
      arrowColors(board, {
        colorMode,
        oneColor: colorMode === 'one' ? chosenColor : undefined,
      }),
    [board, colorMode, chosenColor],
  );

  const handleLevels = useCallback(() => {
    if (onLevels) onLevels();
    else if (onExit) onExit();
    else onNavigate?.('levels');
  }, [onLevels, onExit, onNavigate]);

  const handleNext = useCallback(() => {
    if (onNext) onNext();
    else onNavigate?.('next');
  }, [onNext, onNavigate]);

  const handleHome = useCallback(() => {
    if (onHome) onHome();
    else if (onExit) onExit();
    else onNavigate?.('home');
  }, [onHome, onExit, onNavigate]);

  const handleHelp = useCallback(() => {
    if (onHelp) onHelp();
    else onNavigate?.('help');
  }, [onHelp, onNavigate]);

  const handleSettings = useCallback(() => {
    if (onSettings) onSettings();
    else onNavigate?.('settings');
  }, [onSettings, onNavigate]);

  const onTap = useCallback(
    (arrowId: number) => {
      const r = tap(live.current, arrowId);
      if (r.outcome === 'ignored') return;
      live.current = r.session;
      setSession(r.session);
      setHintId(null);
      if (showCoach) onCoachDone?.();
      if (r.session.status === 'lost') {
        later(() => {
          setLoseShown(true);
          if (sound) playSound('lose');
        }, ANIM.loseCard * 1000);
      }
      if (sound) playSound(r.outcome === 'exit' ? 'exit' : 'blocked');
      if (r.outcome === 'exit') {
        const arrow = board.arrows.find((a) => a.id === arrowId);
        if (r.session.status === 'won' && !reported.current) {
          reported.current = true;
          later(
            () => {
              setWinShown(true);
              if (sound) playSound('win');
            },
            (slideSeconds(board, arrow, slideRate) + ANIM.winCard) * 1000,
          );
          setResult(onWin());
        }
      }
    },
    [board, onWin, sound, slideRate, later, showCoach, onCoachDone],
  );

  const onBlocked = useCallback((_arrowId: number, blockerId: number) => {
    boardCanvasRef.current?.revealArrow(blockerId);
  }, []);

  const onHint = () => {
    if (live.current.status !== 'playing') return;
    if (hints <= 0) {
      onToast?.(`No hints left. Clear ${HINT_GIFT_EVERY} levels for one more.`);
      return;
    }
    const id = hintFor(live.current);
    if (id === undefined) return;
    onHintUsed();
    setHintId(id);
    boardCanvasRef.current?.revealArrow(id);
  };

  const onRestart = () => {
    clearTimers();
    reported.current = false;
    setResult(null);
    setWinShown(false);
    setLoseShown(false);
    setPaused(false);
    setHintId(null);
    const fresh = restart(live.current);
    live.current = fresh;
    setSession(fresh);
    setResetCount((n) => n + 1);
  };

  const left = arrowsLeft(session).length;
  const lastLevel = level >= LEVELS_PER_SIZE;
  const spec = DIFFICULTIES[difficulty];

  const pendingNames = useMemo(() => {
    const list = pendingDifficulties ?? pendingTracks ?? [];
    return list.map((item) => {
      const idx = typeof item === 'number' ? item : item.difficulty;
      return DIFFICULTIES[idx]?.name ?? `Size ${idx}`;
    });
  }, [pendingDifficulties, pendingTracks]);
  const clearedCountVal = clearedInDifficulty ?? clearedInTrack ?? 0;

  return (
    <main className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0">
        <BoardCanvas
          key={`${difficulty}:${level}:${resetCount}`}
          ref={boardCanvasRef}
          level={board}
          idleIds={session.alive}
          colors={colors}
          theme={activeTheme}
          showDots={showDots}
          speedRate={slideRate}
          hintId={hintId}
          isWon={session.status === 'won'}
          onTap={onTap}
          onBlocked={onBlocked}
        />
      </div>

      <p role="status" className="sr-only">
        {session.status === 'won'
          ? 'Level cleared'
          : session.status === 'lost'
            ? 'Out of hearts'
            : `${left} arrows left, ${session.lives} hearts`}
      </p>

      <div className="pointer-events-none absolute inset-0 p-3 *:pointer-events-auto sm:p-5">
        <div className="absolute top-3 left-3 flex items-center gap-2 sm:top-5 sm:left-5">
          <button
            type="button"
            onClick={() => setPaused(true)}
            aria-label="Pause"
            className="grid size-11 place-items-center rounded-full font-bold hud-card"
          >
            <PauseIcon />
          </button>
          <div className="rounded-2xl px-3 py-1.5 leading-tight hud-card">
            <h1 className="font-bold">{spec?.name}</h1>
            <p className="text-xs opacity-80">
              {`Level ${level} · ${board.size}×${board.size}`}
            </p>
          </div>
        </div>

        <span
          role="img"
          aria-label={`${session.lives} lives left`}
          className="absolute top-18 left-3 rounded-full px-3 py-1.5 text-lg tracking-tight hud-card sm:top-5 sm:left-1/2 sm:-translate-x-1/2 sm:text-2xl"
        >
          {'❤️'.repeat(session.lives)}
          {'🤍'.repeat(session.maxLives - session.lives)}
        </span>

        <div className="absolute top-3 right-3 flex flex-col items-end gap-2 sm:top-5 sm:right-5">
          <div className="w-36 rounded-2xl p-2.5 text-sm hud-card sm:w-44">
            <div className="flex items-end justify-between">
              <span className="text-xs opacity-80">Arrows left</span>
              <b className="min-w-12 text-right text-2xl leading-none sm:text-3xl">
                {left}
              </b>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-500/40">
              <div
                className={`h-full rounded-full ${accent.bg}`}
                style={{
                  width: `${
                    board.arrows.length > 0
                      ? ((board.arrows.length - left) / board.arrows.length) *
                        100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => boardCanvasRef.current?.resetView()}
            aria-label="Reset view"
            title="Reset view"
            className="grid size-11 place-items-center rounded-full border border-teal-200/60 bg-linear-to-b from-teal-200 to-teal-500 text-xl font-bold text-slate-900 shadow-[inset_0_2px_0_color-mix(in_srgb,var(--color-glint)_70%,transparent),0_5px_0_var(--color-teal-700),0_8px_12px_color-mix(in_srgb,var(--color-shade)_50%,transparent)] enabled:hover:brightness-110 enabled:active:translate-y-1 enabled:active:shadow-[inset_0_2px_0_color-mix(in_srgb,var(--color-glint)_70%,transparent),0_1px_0_var(--color-teal-700),0_2px_4px_color-mix(in_srgb,var(--color-shade)_50%,transparent)]"
          >
            ⌖
          </button>
        </div>

        <button
          type="button"
          onClick={onHint}
          aria-disabled={hints <= 0}
          className={`absolute bottom-3 left-3 flex h-12 items-center justify-center gap-2 rounded-full px-4 font-semibold hud-card sm:bottom-5 sm:left-5 ${hints <= 0 ? 'opacity-40' : ''}`}
        >
          {`💡 ${hints}`}
        </button>

        <p className="absolute bottom-3 left-1/2 hidden w-[min(22rem,calc(100%-14rem))] -translate-x-1/2 rounded-2xl px-3 py-2 text-center text-xs hud-card sm:bottom-5 sm:text-sm sm:[@media(min-height:720px)]:block">
          <b>Tip</b> · Hold an arrow to preview its path without risking a
          heart.
        </p>

        <div className="absolute right-3 bottom-3 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5">
          <button
            type="button"
            onClick={onRestart}
            className="h-12 rounded-full px-4 text-sm font-semibold hud-card"
          >
            ↻ Restart
          </button>
        </div>
      </div>

      {showCoach && session.status === 'playing' && (
        <CoachMark onDone={onCoachDone ?? (() => {})} />
      )}

      {paused && session.status === 'playing' && (
        <Modal onClose={() => setPaused(false)}>
          <h2 className="text-2xl font-bold text-strong">Paused</h2>
          <div className="mt-5 flex flex-col gap-2">
            <ModalButton
              label="Resume"
              primary
              onClick={() => setPaused(false)}
            />
            <ModalButton label="Restart level" onClick={onRestart} />
            <ModalButton label="Levels" onClick={handleLevels} />
            <ModalButton
              label="How to play"
              onClick={() => {
                setPaused(false);
                handleHelp();
              }}
            />
            <ModalButton
              label="Settings"
              onClick={() => {
                setPaused(false);
                handleSettings();
              }}
            />
            <ModalButton label="Home" onClick={handleHome} />
          </div>
        </Modal>
      )}

      {session.status === 'won' && result && winShown && (
        <Modal>
          <div
            className={`mx-auto mb-2 grid size-16 place-items-center rounded-full text-3xl text-ink ${accent.bg}`}
          >
            ✓
          </div>
          <h2 className="text-2xl font-bold text-strong">
            Cleared{name ? `, ${name}` : ''}!
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {spec?.name ?? 'Level'} · {level}
          </p>
          {result.hintGifted && (
            <p className="mt-3 rounded-xl bg-night p-2 text-sm font-semibold text-link">
              +1 hint earned
            </p>
          )}
          {result.unlocked.length > 0 ? (
            <p className="mt-3 rounded-xl bg-amber-400 p-2 text-sm font-bold text-ink">
              {result.unlocked
                .map((d) => DIFFICULTIES[d]?.name ?? `Size ${d}`)
                .join(' and ')}{' '}
              unlocked!
            </p>
          ) : (
            pendingNames.length > 0 && (
              <p className="mt-3 text-xs text-slate-400">
                {Math.min(clearedCountVal, UNLOCK_AFTER)} / {UNLOCK_AFTER} to
                unlock {pendingNames.join(' and ')}
              </p>
            )
          )}
          <div className="mt-5 flex flex-col gap-2">
            {lastLevel ? (
              <ModalButton label="Levels" primary onClick={handleLevels} />
            ) : (
              <ModalButton label="Next level" primary onClick={handleNext} />
            )}
            <ModalButton label="Play again" onClick={onRestart} />
            {!lastLevel && (
              <ModalButton label="Levels" onClick={handleLevels} />
            )}
          </div>
        </Modal>
      )}

      {session.status === 'lost' && loseShown && (
        <Modal>
          <div className="text-5xl">💔</div>
          <h2 className="mt-2 text-2xl font-bold text-strong">Out of hearts</h2>
          <p className="mt-1 text-sm text-slate-400">
            Look for arrows with a clear path first.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <ModalButton label="Try again" primary onClick={onRestart} />
            <ModalButton label="Levels" onClick={handleLevels} />
          </div>
        </Modal>
      )}
    </main>
  );
}
