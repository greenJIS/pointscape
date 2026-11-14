import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  readonly children?: ReactNode;
}

interface State {
  readonly failed: boolean;
}

/**
 * One arrow in the board style (shadow, dark edge, light core, glint, concave head), drawn as plain SVG so
 * this screen does not depend on the canvas code that may be what failed. One cell is 40 units.
 */
function BoardArrow() {
  const line = {
    x1: 20,
    y1: 32,
    x2: 84,
    y2: 32,
    strokeLinecap: 'round',
  } as const;
  const head = '102,32 82.8,17.6 87.6,32 82.8,46.4';
  return (
    <svg viewBox="0 0 120 64" aria-hidden="true" className="w-36">
      <g opacity={0.35} transform="translate(2.4 4)">
        <line {...line} stroke="#000" strokeWidth={12} />
        <polygon points={head} fill="#000" />
      </g>
      <line {...line} stroke="#8c4c00" strokeWidth={12} />
      <polygon
        points={head}
        fill="#8c4c00"
        stroke="#8c4c00"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <line {...line} stroke="#ff8a00" strokeWidth={8} />
      <polygon points={head} fill="#ff8a00" />
      <line
        {...line}
        stroke="#fff"
        strokeOpacity={0.55}
        strokeWidth={2}
        transform="translate(-1.6 -1.6)"
      />
    </svg>
  );
}

/**
 * Last line of defence: a render error, or a file that fails to load (offline after an update),
 * shows a way out instead of a blank page. Progress is saved already, so a reload loses nothing.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main
        role="alert"
        className="grid h-dvh place-items-center bg-slate-950 bg-[radial-gradient(circle,var(--color-slate-800)_1.6px,transparent_1.8px)] bg-size-[44px_44px] p-6 text-center text-slate-200"
      >
        <div className="flex max-w-sm flex-col items-center rounded-3xl p-8 hud-card">
          <span className="text-3xl font-black tracking-tight logo-word">
            Pointscape
          </span>
          <BoardArrow />
          <h1 className="mt-2 text-2xl font-black text-strong">
            Something went wrong
          </h1>
          <p className="mt-2 text-slate-300">
            Your progress is saved. Reload to carry on.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-2xl bg-teal-300 py-3 font-bold text-ink active:scale-97"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }
}
