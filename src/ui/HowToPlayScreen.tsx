import type { ReactNode } from 'react';
import { POOL } from '../view/palette';
import { MiniBoard } from './MiniBoard';
import { miniScene, previewOf, type MiniArrow } from './miniScene';
import { Page } from './Page';

interface Props {
  readonly onBack: () => void;
}

const PICTURE = 'rounded-xl';

const ORANGE = POOL[0] ?? '#ff8a00';
const YELLOW = POOL[1] ?? '#ffe600';
const TEAL = POOL[2] ?? '#00f5d0';
const INDIGO = POOL[3] ?? '#5b6bff';
const MAGENTA = POOL[4] ?? '#ff2bd6';

/** A row of three cells that points right, starting at column `x`. */
const right = (x: number, y: number, color: string): MiniArrow => ({
  cells: [
    [x, y],
    [x + 1, y],
    [x + 2, y],
  ],
  dir: [1, 0],
  color,
});

/** A row of three cells that points left, with its tail at column `x`. */
const left = (x: number, y: number, color: string): MiniArrow => ({
  cells: [
    [x, y],
    [x - 1, y],
    [x - 2, y],
  ],
  dir: [-1, 0],
  color,
});

const CLEAR = miniScene(5, 3, [
  right(0, 1, TEAL),
  right(0, 0, INDIGO),
  left(4, 2, YELLOW),
]);
const BLOCKED = miniScene(5, 3, [
  right(0, 1, ORANGE),
  {
    cells: [
      [4, 2],
      [4, 1],
      [4, 0],
    ],
    dir: [0, -1],
    color: MAGENTA,
  },
]);
const BOARD = miniScene(5, 3, [
  right(0, 0, TEAL),
  right(1, 1, ORANGE),
  left(4, 2, YELLOW),
]);
const BOARD_ORDER: readonly number[] = [0, 1, 2];
/** The green and red dashed lines the game draws when you hold an arrow. */
const OK_PATH = previewOf(0, false, 3);
const BAD_PATH = previewOf(0, true, 1.5);

const CARDS: readonly {
  readonly title: string;
  readonly text: string;
  readonly picture: ReactNode;
}[] = [
  {
    title: 'Find a clear path',
    text: 'Look in front of the arrow head. If nothing is in the way, tap it and it slides out.',
    picture: <MiniBoard scene={CLEAR} preview={OK_PATH} className={PICTURE} />,
  },
  {
    title: 'Avoid blockers',
    text: 'Another arrow in the way stops it. A blocked tap costs a heart, once per arrow.',
    picture: (
      <MiniBoard scene={BLOCKED} preview={BAD_PATH} className={PICTURE} />
    ),
  },
  {
    title: 'Clear the board',
    text: 'Remove every arrow before you run out of hearts. Bigger boards give you more.',
    picture: (
      <MiniBoard scene={BOARD} order={BOARD_ORDER} loop className={PICTURE} />
    ),
  },
];

const TIPS: readonly string[] = [
  'Hold an arrow to preview its path before tapping.',
  'Drag to pan around the board.',
  'Pinch or use mouse wheel to zoom in and out.',
];

export function HowToPlayScreen({ onBack }: Props) {
  return (
    <Page title="How to play" onBack={onBack} overlay>
      <div className="grid gap-4 sm:grid-cols-3">
        {CARDS.map((c, i) => (
          <section key={c.title} className="rounded-3xl p-4 hud-card">
            {c.picture}
            <h2 className="mt-3 font-bold text-strong">
              {i + 1}. {c.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{c.text}</p>
          </section>
        ))}
      </div>
      <ul className="rounded-3xl p-4 text-sm hud-card">
        {TIPS.map((t) => (
          <li key={t} className="flex items-start gap-3 py-1">
            <span
              aria-hidden="true"
              className="mt-1.5 size-2 shrink-0 rounded-full bg-teal-300"
            />
            {t}
          </li>
        ))}
      </ul>
    </Page>
  );
}
