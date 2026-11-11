import { describe, expect, it } from 'vitest';
import { unlockAllEnabled } from './dev';

describe('unlockAllEnabled', () => {
  it('returns a boolean based on environment', () => {
    expect(typeof unlockAllEnabled()).toBe('boolean');
  });
});
