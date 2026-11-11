import { describe, expect, it, vi } from 'vitest';
import { revealTheme } from './useDark';

describe('revealTheme', () => {
  it('calls apply directly if view transitions are not supported', () => {
    const apply = vi.fn();
    const btn = {
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 10, height: 10 }),
    } as unknown as HTMLElement;
    revealTheme(btn, apply);
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
