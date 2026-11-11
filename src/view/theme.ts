import type { ThemeMode } from '../game/settings';

export interface ThemeColors {
  readonly board: string;
  readonly dot: string;
  readonly glint: string;
  readonly shade: string;
  readonly ok: string;
  readonly blocked: string;
}

export const THEME_COLORS: Readonly<Record<ThemeMode, ThemeColors>> = {
  light: {
    board: '#e2e8f0',
    dot: '#94a3b8',
    glint: '#ffffff',
    shade: '#000000',
    ok: '#4ade80',
    blocked: '#ff4d5e',
  },
  dark: {
    board: '#1e293b',
    dot: '#475569',
    glint: '#ffffff',
    shade: '#000000',
    ok: '#4ade80',
    blocked: '#ff4d5e',
  },
};

export function cssVar(name: string): string {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function readTheme(mode: ThemeMode = 'light'): ThemeColors {
  const fallback = THEME_COLORS[mode];
  if (typeof document === 'undefined') return fallback;
  return {
    board: cssVar('--scene-board') || fallback.board,
    dot: cssVar('--scene-dot') || fallback.dot,
    glint: cssVar('--color-glint') || fallback.glint,
    shade: cssVar('--color-shade') || fallback.shade,
    ok: cssVar('--color-ok') || fallback.ok,
    blocked: cssVar('--color-blocked') || fallback.blocked,
  };
}
