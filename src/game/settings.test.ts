import { describe, expect, it } from 'vitest';
import { ARROW_SPEED_RATE, defaultSettings } from './settings';

describe('settings', () => {
  it('defaultSettings provides expected 2D settings without layer toggles', () => {
    const s = defaultSettings();
    expect(s).toEqual({
      theme: 'light',
      colorMode: 'multi',
      oneColor: '#00f5d0',
      arrowSpeed: 'normal',
      showDots: false,
      sound: true,
    });
    expect('showLayers' in s).toBe(false);
    expect('lowPower' in s).toBe(false);
  });

  it('arrow speed rates match specification (slow 0.6, normal 1, fast 1.6)', () => {
    expect(ARROW_SPEED_RATE.slow).toBe(0.6);
    expect(ARROW_SPEED_RATE.normal).toBe(1);
    expect(ARROW_SPEED_RATE.fast).toBe(1.6);
  });
});
