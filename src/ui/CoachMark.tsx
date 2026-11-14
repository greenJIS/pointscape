interface Props {
  readonly onDone: () => void;
}

/**
 * First-time hint on Tiny 1. Docked in the bottom strip the board leaves free (GameScreen reserves
 * it), above the bottom buttons on phones and between them on wide screens. Taps outside the card
 * pass through to the board, and the first tap on the board dismisses it. It is the only popup that
 * can appear during a level.
 */
export function CoachMark({ onDone }: Props) {
  return (
    <div
      role="note"
      className="pointer-events-none fixed inset-x-3 bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4.25rem))] z-20 mx-auto max-w-md sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:w-[min(28rem,calc(100%-14rem))]"
    >
      <div className="rounded-2xl p-3 hud-card">
        <p className="text-sm">
          Tap an arrow with a clear path in front of its head. Blocked arrows
          cost a heart. Hold an arrow to preview its path first.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="pointer-events-auto mt-2 w-full rounded-xl bg-teal-300 py-2.5 font-bold text-ink active:scale-97"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
