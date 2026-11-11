import { useEffect } from 'react';
import { POOL } from '../view/palette';

interface Props {
  readonly dark?: boolean;
  readonly onReady?: () => void;
}

interface BackdropArrow {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly dir: 'r' | 'l' | 'u' | 'd';
  readonly color: string;
  readonly delay: number;
  readonly duration: number;
}

const ARROWS: readonly BackdropArrow[] = [
  {
    id: 1,
    x: 80,
    y: 120,
    length: 110,
    dir: 'r',
    color: POOL[2] ?? '#00f5d0',
    delay: 0,
    duration: 6,
  },
  {
    id: 2,
    x: 260,
    y: 220,
    length: 140,
    dir: 'd',
    color: POOL[0] ?? '#ff8a00',
    delay: 1.2,
    duration: 7,
  },
  {
    id: 3,
    x: 120,
    y: 540,
    length: 130,
    dir: 'u',
    color: POOL[3] ?? '#5b6bff',
    delay: 0.5,
    duration: 6.5,
  },
  {
    id: 4,
    x: 60,
    y: 720,
    length: 150,
    dir: 'r',
    color: POOL[1] ?? '#ffe600',
    delay: 2,
    duration: 8,
  },
  {
    id: 5,
    x: 820,
    y: 140,
    length: 130,
    dir: 'd',
    color: POOL[4] ?? '#ff2bd6',
    delay: 0.8,
    duration: 6.2,
  },
  {
    id: 6,
    x: 920,
    y: 380,
    length: 120,
    dir: 'l',
    color: POOL[2] ?? '#00f5d0',
    delay: 1.8,
    duration: 7.2,
  },
  {
    id: 7,
    x: 850,
    y: 680,
    length: 160,
    dir: 'u',
    color: POOL[0] ?? '#ff8a00',
    delay: 2.5,
    duration: 6.8,
  },
  {
    id: 8,
    x: 680,
    y: 820,
    length: 140,
    dir: 'l',
    color: POOL[3] ?? '#5b6bff',
    delay: 1.1,
    duration: 7.5,
  },
  {
    id: 9,
    x: 340,
    y: 880,
    length: 100,
    dir: 'r',
    color: POOL[4] ?? '#ff2bd6',
    delay: 3,
    duration: 6,
  },
];

function ArrowPath({ arrow }: { readonly arrow: BackdropArrow }) {
  const { x, y, length, dir, color, delay, duration } = arrow;
  const strokeWidth = 14;
  const headSize = 18;

  let x2 = x;
  let y2 = y;
  let headPath = '';
  let animClass = '';

  switch (dir) {
    case 'r':
      x2 = x + length;
      headPath = `M ${x2 + 4} ${y} L ${x2 - headSize} ${y - headSize * 0.9} L ${x2 - headSize} ${y + headSize * 0.9} Z`;
      animClass = 'backdrop-slide-h';
      break;
    case 'l':
      x2 = x - length;
      headPath = `M ${x2 - 4} ${y} L ${x2 + headSize} ${y - headSize * 0.9} L ${x2 + headSize} ${y + headSize * 0.9} Z`;
      animClass = 'backdrop-slide-h-rev';
      break;
    case 'd':
      y2 = y + length;
      headPath = `M ${x} ${y2 + 4} L ${x - headSize * 0.9} ${y2 - headSize} L ${x + headSize * 0.9} ${y2 - headSize} Z`;
      animClass = 'backdrop-slide-v';
      break;
    case 'u':
      y2 = y - length;
      headPath = `M ${x} ${y2 - 4} L ${x - headSize * 0.9} ${y2 + headSize} L ${x + headSize * 0.9} ${y2 + headSize} Z`;
      animClass = 'backdrop-slide-v-rev';
      break;
  }

  return (
    <g
      className={animClass}
      style={{
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        transformOrigin: `${x}px ${y}px`,
      }}
    >
      <line
        x1={x}
        y1={y}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        opacity={0.85}
      />
      <path d={headPath} fill={color} opacity={0.85} />
    </g>
  );
}

/**
 * Flat SVG backdrop for Home and Name screens: decorative animated arrows and grid dots.
 */
export function HomeBackdrop({ onReady }: Props) {
  useEffect(() => {
    // Notify readiness once mounted so parent can transition smoothly.
    onReady?.();
  }, [onReady]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      <style>{`
        @keyframes backdropFloatH {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(20px); }
        }
        @keyframes backdropFloatHRev {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-20px); }
        }
        @keyframes backdropFloatV {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(20px); }
        }
        @keyframes backdropFloatVRev {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .backdrop-slide-h {
          animation: backdropFloatH ease-in-out infinite;
        }
        .backdrop-slide-h-rev {
          animation: backdropFloatHRev ease-in-out infinite;
        }
        .backdrop-slide-v {
          animation: backdropFloatV ease-in-out infinite;
        }
        .backdrop-slide-v-rev {
          animation: backdropFloatVRev ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .backdrop-slide-h, .backdrop-slide-h-rev, .backdrop-slide-v, .backdrop-slide-v-rev {
            animation: none !important;
          }
        }
      `}</style>

      <svg
        className="size-full opacity-60"
        viewBox="0 0 1000 1000"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="home-dots-grid"
            width="44"
            height="44"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="22"
              cy="22"
              r="1.6"
              fill="var(--color-slate-700)"
              opacity="0.6"
            />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#home-dots-grid)" />

        {ARROWS.map((a) => (
          <ArrowPath key={a.id} arrow={a} />
        ))}
      </svg>
    </div>
  );
}
