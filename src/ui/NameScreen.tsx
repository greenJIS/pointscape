import { useState } from 'react';
import { MAX_NAME_LENGTH } from '../game/playerName';
import { Logo } from './Logo';
import { Stage } from './Stage';

interface Props {
  readonly dark: boolean;
  /** Raw text. An empty string means "give me an animal name". */
  readonly onDone: (raw: string) => void;
}

export function NameScreen({ dark, onDone }: Props) {
  const [text, setText] = useState('');
  return (
    <Stage dark={dark}>
      <div className="absolute inset-0 grid place-items-center p-6">
        <form
          className="flex w-full max-w-sm flex-col items-center text-center"
          onSubmit={(e) => {
            e.preventDefault();
            onDone(text);
          }}
        >
          <p className="rounded-full px-4 py-1 text-lg font-semibold hud-card">
            Welcome to
          </p>
          <Logo className="mt-1 text-4xl sm:text-5xl" />
          <label
            htmlFor="name"
            className="mt-6 rounded-full px-4 py-1 font-semibold hud-card"
          >
            What&apos;s your name?
          </label>
          <input
            id="name"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            placeholder="Your name"
            className="mt-2 w-full rounded-2xl px-4 py-3 text-center text-lg font-semibold hud-card outline-none focus:border-teal-300"
          />
          <p className="mt-2 rounded-xl px-3 py-1.5 text-xs hud-card">
            Up to {MAX_NAME_LENGTH} characters. Saved on this device only.
            Change it any time in Settings.
          </p>
          <button
            type="submit"
            className="mt-5 w-full rounded-3xl bg-teal-300 py-4 text-xl font-black text-ink shadow-[0_3px_0_var(--color-teal-700)] active:scale-97"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={() => onDone('')}
            className="mt-4 rounded-full px-4 py-3 text-sm font-semibold hud-card"
          >
            Skip
          </button>
        </form>
      </div>
    </Stage>
  );
}
