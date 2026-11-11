import { useEffect, useState, type ReactNode } from 'react';
import { HomeBackdrop } from './HomeBackdrop';
import { Loading } from './Loading';

const MIN_LOADING_MS = 200;
/** Matches `duration-300` on the overlay. */
const FADE_MS = 300;

interface Props {
  readonly dark: boolean;
  readonly children?: ReactNode;
}

/** Full-page stage for Home and the name screen: decorative arrows with a soft veil behind content. */
export function Stage({ dark, children }: Props) {
  const [drawn, setDrawn] = useState(false);
  const [waited, setWaited] = useState(false);

  // Show the loading card for a brief moment so it never flashes.
  useEffect(() => {
    const id = window.setTimeout(() => setWaited(true), MIN_LOADING_MS);
    return () => window.clearTimeout(id);
  }, []);

  const ready = drawn && waited;

  // Drop the overlay once it has faded.
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => setGone(true), FADE_MS);
    return () => window.clearTimeout(id);
  }, [ready]);

  return (
    <main className="relative h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,var(--color-slate-900)_0%,var(--color-slate-800)_100%)]">
      <HomeBackdrop dark={dark} onReady={() => setDrawn(true)} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_34%_48%_at_50%_46%,color-mix(in_srgb,var(--color-slate-800)_92%,transparent)_0%,color-mix(in_srgb,var(--color-slate-800)_70%,transparent)_55%,transparent_100%)]" />
      {children}
      {!gone && (
        <div
          aria-hidden={ready}
          className={`absolute inset-0 z-30 transition-opacity duration-300 ${ready ? 'pointer-events-none opacity-0' : ''}`}
        >
          <Loading label="Loading" />
        </div>
      )}
    </main>
  );
}
