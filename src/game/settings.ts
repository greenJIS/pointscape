export type ColorMode = 'multi' | 'one';

export type ThemeMode = 'light' | 'dark';

export type ArrowSpeed = 'slow' | 'normal' | 'fast';

/** How much faster than the design demo each arrow speed plays the exit slide. */
export const ARROW_SPEED_RATE: Readonly<Record<ArrowSpeed, number>> = {
  slow: 0.6,
  normal: 1,
  fast: 1.6,
};

export interface Settings {
  readonly theme: ThemeMode;
  readonly colorMode: ColorMode;
  /** One-color mode: the palette colour every arrow uses. */
  readonly oneColor: string;
  readonly arrowSpeed: ArrowSpeed;
  readonly showDots: boolean;
  readonly sound: boolean;
}

/** Multi-color is the default (FR-37). */
export const defaultSettings = (): Settings => ({
  theme: 'light',
  colorMode: 'multi',
  oneColor: '#00f5d0',
  arrowSpeed: 'normal',
  showDots: false,
  sound: true,
});
