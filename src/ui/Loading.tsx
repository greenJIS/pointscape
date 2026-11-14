import { useEffect, useState } from 'react';
import { POOL } from '../view/palette';
import { Logo } from './Logo';
import { MiniBoard } from './MiniBoard';
import { miniScene } from './miniScene';

interface Props {
  readonly label?: string;
  /** Second line under the label, for example the track and level. */
  readonly detail?: string;
  /** Cover the whole screen above everything else, for a board that is still drawing. */
  readonly overlay?: boolean;
}

const TIPS: readonly string[] = [
  'Look in front of the arrow head. If nothing is in the way, tap it.',
  'A blocked tap costs a heart, once per arrow.',
  'There is no undo, so look before you tap.',
  'Bigger boards give you more hearts.',
  'Clear every arrow to win the level.',
  'Clearing 10 levels opens the next level set.',
];
const TIP_MS = 3500;

const ORANGE = POOL[0] ?? '#ff8a00';
const YELLOW = POOL[1] ?? '#ffe600';
const TEAL = POOL[2] ?? '#00f5d0';
const INDIGO = POOL[3] ?? '#5b6bff';
const MAGENTA = POOL[4] ?? '#ff2bd6';

/** Listed so that each arrow leaves a clear path for the next one, as in the game. Ids follow this order. */
const SCENE = miniScene(6, 4, [
  {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    dir: [1, 0],
    color: TEAL,
  },
  {
    cells: [
      [0, 3],
      [0, 2],
      [0, 1],
    ],
    dir: [0, -1],
    color: YELLOW,
  },
  {
    cells: [
      [2, 3],
      [2, 2],
      [2, 1],
    ],
    dir: [0, -1],
    color: ORANGE,
  },
  {
    cells: [
      [1, 3],
      [1, 2],
      [1, 1],
    ],
    dir: [0, -1],
    color: INDIGO,
  },
  {
    cells: [
      [5, 1],
      [4, 1],
      [3, 1],
    ],
    dir: [-1, 0],
    color: MAGENTA,
  },
  {
    cells: [
      [4, 3],
      [5, 3],
      [5, 2],
    ],
    dir: [0, -1],
    color: TEAL,
  },
]);
const ORDER: readonly number[] = [0, 1, 2, 3, 4, 5];

/** The small board: the real renderer, with arrows that slide away and come back. */
function Board() {
  return (
    <div
      aria-hidden="true"
      className="w-full max-w-84 overflow-hidden rounded-3xl border border-slate-600 shadow-[0_12px_26px_color-mix(in_srgb,var(--color-shade)_35%,transparent)]"
    >
      <MiniBoard scene={SCENE} order={ORDER} loop />
    </div>
  );
}

/** Own state, so a new tip does not redraw the board. */
function Tip() {
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => {
    const t = window.setInterval(
      () => setTip((i) => (i + 1) % TIPS.length),
      TIP_MS,
    );
    return () => window.clearInterval(t);
  }, []);
  return (
    <p
      key={tip}
      className="min-h-12 max-w-sm load-tip text-center text-base text-slate-300"
    >
      {TIPS[tip]}
    </p>
  );
}

/** The loading screen: the logo, a small board where arrows slide away and return, and a tip. */
export function Loading({ label = 'Loading', detail, overlay = false }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`grid place-items-center overflow-hidden bg-slate-950 bg-[radial-gradient(circle,var(--color-slate-800)_1.6px,transparent_1.8px)] bg-size-[44px_44px] ${overlay ? 'absolute inset-0 z-30' : 'h-dvh'}`}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-5 px-5">
        <Logo className="text-3xl" />
        <Board />
        <div className="text-center">
          <p className="text-xl font-extrabold text-strong">{label}</p>
          {detail && (
            <p className="mt-1 text-base font-semibold text-slate-300">
              {detail}
            </p>
          )}
        </div>
        <div
          aria-hidden="true"
          className="h-2.5 w-65 overflow-hidden rounded-full border border-slate-600 bg-slate-900"
        >
          <i className="block h-full w-2/5 load-bar rounded-full" />
        </div>
        <Tip />
      </div>
    </div>
  );
}
