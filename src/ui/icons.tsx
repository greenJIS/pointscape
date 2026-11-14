interface IconProps {
  readonly className?: string;
}

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** Line icons in the text colour, so they follow the theme and never turn into emoji. */
export function HelpIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 9a3 3 0 1 1 4.6 2.5c-1 .6-1.6 1.2-1.6 2.5" />
      <path d="M12 17.5v.01" />
    </svg>
  );
}

export function SettingsIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  );
}

export function PauseIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 6v12M15 6v12" />
    </svg>
  );
}

export function BackIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function SunIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </svg>
  );
}

const solid = { viewBox: '0 0 24 24', 'aria-hidden': true } as const;

const HEART_PATH =
  'M12 20.5C5 16 2.5 12.5 2.5 9a5 5 0 0 1 9.5-2.2A5 5 0 0 1 21.5 9c0 3.5-2.5 7-9.5 11.5z';

interface HeartProps extends IconProps {
  /** Filled red heart when true, empty outline when false. */
  readonly filled?: boolean;
}

export function Heart({ className = 'size-5', filled = true }: HeartProps) {
  return (
    <svg {...solid} className={className}>
      <path
        d={HEART_PATH}
        fill={filled ? 'var(--color-blocked)' : 'none'}
        stroke={filled ? 'var(--color-danger-edge)' : 'currentColor'}
        strokeWidth={filled ? 1.2 : 2}
        strokeLinejoin="round"
        opacity={filled ? 1 : 0.5}
      />
    </svg>
  );
}

export function HeartBroken({ className = 'size-5' }: IconProps) {
  return (
    <svg {...solid} className={className}>
      <path
        d={HEART_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M12 7.5l-2 3.5 3 2-2 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Bulb({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.7.6 1 1.3 1 2.1h5c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3z" />
    </svg>
  );
}

export function Restart({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 12a8 8 0 1 0 2.5-5.8" />
      <path d="M4 4v5h5" />
    </svg>
  );
}

export function Target({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 12v.010" />
    </svg>
  );
}

export function Star({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  );
}

export function Play({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  );
}

export function Grid({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

export function Lock({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function Check({ className = 'size-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
