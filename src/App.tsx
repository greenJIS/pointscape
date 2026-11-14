import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { LEVELS_PER_SIZE } from './core/difficulty';
import { createRng } from './core/rng';
import { browserStore } from './game/browserStore';
import { unlockAllEnabled } from './game/dev';
import { cleanName, nameOrAnimal } from './game/playerName';
import {
  clearedCount,
  isSizeUnlocked,
  isUnlocked,
  markTutorialSeen,
  opens,
  recordClear,
  spendHint,
  type ClearResult,
} from './game/progress';
import type { Settings } from './game/settings';
import {
  loadSave,
  resetProgress,
  writeSave,
  type SaveData,
} from './game/storage';
import { useDark } from './game/useDark';
import { DifficultyScreen } from './ui/DifficultyScreen';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { HomeScreen } from './ui/HomeScreen';
import { HowToPlayScreen } from './ui/HowToPlayScreen';
import { LevelGate } from './ui/LevelGate';
import { LevelsScreen } from './ui/LevelsScreen';
import { Loading } from './ui/Loading';
import { NameScreen } from './ui/NameScreen';
import { SettingsScreen } from './ui/SettingsScreen';

type Screen =
  | { readonly name: 'name' }
  | { readonly name: 'home' }
  | { readonly name: 'difficulty' }
  | { readonly name: 'levels'; readonly difficulty: number }
  | {
      readonly name: 'game';
      readonly difficulty: number;
      readonly level: number;
    };

// The board loads only when a level opens, so Home paints sooner.
const GameScreen = lazy(() =>
  import('./ui/GameScreen').then((m) => ({ default: m.GameScreen })),
);

const TOAST_MS = 2200;

const store = browserStore();

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave(store));
  const [screen, setScreen] = useState<Screen>(() =>
    save.name ? { name: 'home' } : { name: 'name' },
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Developer unlock-all (FR-26). Never saved, so it cannot leak into real progress (FR-27).
  const devAvailable = unlockAllEnabled();
  const [devOn, setDevOn] = useState(devAvailable);
  const unlockAll = devAvailable && devOn;

  const [toast, setToast] = useState<string | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
    writeSave(store, save);
  }, [save]);

  useEffect(() => {
    if (toast === null) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const { progress } = save;
  const dark = useDark(save.settings.theme);

  const play = useCallback(
    (difficulty: number, level: number) => {
      if (!isUnlocked(difficulty, level, saveRef.current.progress, unlockAll)) {
        return;
      }
      setScreen({ name: 'game', difficulty, level });
    },
    [unlockAll],
  );

  const onWin = useCallback(
    (difficulty: number, level: number): ClearResult => {
      const result = recordClear(saveRef.current.progress, difficulty, level);
      saveRef.current = { ...saveRef.current, progress: result.progress };
      setSave(saveRef.current);
      return result;
    },
    [],
  );

  const onHintUsed = useCallback(() => {
    const next = spendHint(saveRef.current.progress);
    if (!next) return;
    saveRef.current = { ...saveRef.current, progress: next };
    setSave(saveRef.current);
  }, []);

  const onCoachDone = useCallback(() => {
    saveRef.current = {
      ...saveRef.current,
      progress: markTutorialSeen(saveRef.current.progress),
    };
    setSave(saveRef.current);
  }, []);

  const setName = (raw: string, fillAnimal: boolean) =>
    setSave((s) => ({
      ...s,
      name: fillAnimal
        ? nameOrAnimal(raw, createRng(Date.now()))
        : cleanName(raw) || s.name,
    }));

  const setSettings = (settings: Settings) =>
    setSave((s) => ({ ...s, settings }));

  let body;
  switch (screen.name) {
    case 'name':
      body = (
        <NameScreen
          dark={dark}
          onDone={(raw) => {
            setName(raw, true);
            setScreen({ name: 'home' });
          }}
        />
      );
      break;
    case 'home':
      body = (
        <HomeScreen
          dark={dark}
          name={save.name}
          progress={progress}
          onPlay={() => play(progress.last.difficulty, progress.last.level)}
          onAllLevels={() => setScreen({ name: 'difficulty' })}
          onSettings={() => setSettingsOpen(true)}
          onHelp={() => setHelpOpen(true)}
        />
      );
      break;
    case 'difficulty':
      body = (
        <DifficultyScreen
          progress={progress}
          unlockAll={unlockAll}
          onPick={(difficulty) => setScreen({ name: 'levels', difficulty })}
          onLocked={setToast}
          onBack={() => setScreen({ name: 'home' })}
        />
      );
      break;
    case 'levels':
      body = (
        <LevelsScreen
          difficulty={screen.difficulty}
          progress={progress}
          unlockAll={unlockAll}
          onPickDifficulty={(difficulty) =>
            setScreen({ name: 'levels', difficulty })
          }
          onPlay={play}
          onLocked={setToast}
          onBack={() => setScreen({ name: 'difficulty' })}
        />
      );
      break;
    case 'game': {
      const { difficulty, level } = screen;
      body = (
        <LevelGate
          key={`${difficulty}:${level}`}
          difficulty={difficulty}
          level={level}
        >
          {(board) => (
            <GameScreen
              board={board}
              difficulty={difficulty}
              level={level}
              hints={progress.hints}
              dark={dark}
              colorMode={save.settings.colorMode}
              oneColor={save.settings.oneColor}
              sound={save.settings.sound}
              arrowSpeed={save.settings.arrowSpeed}
              showDots={save.settings.showDots}
              clearedInTrack={clearedCount(progress, difficulty)}
              pendingTracks={opens(difficulty).filter(
                (d) => !isSizeUnlocked(d, progress, false),
              )}
              onHintUsed={onHintUsed}
              onWin={() => onWin(difficulty, level)}
              onNext={() =>
                setScreen({
                  name: 'game',
                  difficulty,
                  level: Math.min(level + 1, LEVELS_PER_SIZE),
                })
              }
              onLevels={() => setScreen({ name: 'levels', difficulty })}
              showCoach={
                difficulty === 0 && level === 1 && !progress.seenTutorial
              }
              onCoachDone={onCoachDone}
              onSettings={() => setSettingsOpen(true)}
              onHelp={() => setHelpOpen(true)}
              onHome={() => setScreen({ name: 'home' })}
              onToast={setToast}
              name={save.name}
            />
          )}
        </LevelGate>
      );
      break;
    }
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-950 text-slate-200">
        <Suspense fallback={<Loading />}>{body}</Suspense>
        {settingsOpen && (
          <SettingsScreen
            name={save.name}
            settings={save.settings}
            dev={
              devAvailable
                ? { on: devOn, toggle: () => setDevOn((v) => !v) }
                : null
            }
            onName={(name) => setName(name, false)}
            onSettings={setSettings}
            onReset={() => {
              setSave((s) => resetProgress(s));
              setScreen({ name: 'home' });
              setToast('Progress reset');
            }}
            onBack={() => setSettingsOpen(false)}
          />
        )}
        {helpOpen && <HowToPlayScreen onBack={() => setHelpOpen(false)} />}
        {unlockAll && (
          <span className="pointer-events-none fixed inset-x-0 top-0 z-40 mx-auto w-fit rounded-b-md bg-amber-400 px-2 py-0.5 text-[10px] leading-none font-bold text-ink opacity-90">
            DEV: all unlocked
          </span>
        )}
        {toast !== null && (
          <div
            role="status"
            className="pointer-events-none fixed inset-x-0 bottom-[max(5rem,calc(env(safe-area-inset-bottom)+3.5rem))] z-40 mx-auto w-fit max-w-[90vw] rounded-full px-5 py-2.5 text-center text-sm font-semibold hud-card"
          >
            {toast}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
