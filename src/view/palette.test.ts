import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildLevel } from '../core/levels';
import { BLOCKED, POOL, arrowColors } from './palette';

const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8');
const token = (name: string): string | undefined =>
  new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, 'i').exec(css)?.[1];

describe('POOL', () => {
  it('matches the colour scheme in index.css', () => {
    const names = ['orange', 'yellow', 'teal', 'indigo', 'magenta'];
    expect(POOL).toEqual(names.map((n) => token(`pool-${n}`)));
    expect(BLOCKED).toBe(token('blocked'));
  });
});

describe('arrowColors', () => {
  it('maps each arrow to a color in POOL', () => {
    const level = buildLevel(0, 5);
    const colors = arrowColors(level);
    expect(colors.length).toBe(level.arrows.length);
    for (const c of colors) {
      expect(POOL).toContain(c);
    }
  });

  it('is deterministic for the same level', () => {
    const level = buildLevel(0, 5);
    expect(arrowColors(level)).toEqual(arrowColors(level));
  });

  it('respects oneColor setting when colorMode is one', () => {
    const level = buildLevel(0, 5);
    const colors = arrowColors(level, {
      colorMode: 'one',
      oneColor: '#00f5d0',
    });
    expect(colors.length).toBe(level.arrows.length);
    for (const c of colors) {
      expect(c).toBe('#00f5d0');
    }
  });
});
