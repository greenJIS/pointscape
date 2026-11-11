import { describe, expect, it } from 'vitest';
import { createRng } from '../core/rng';
import { ANIMALS, cleanName, nameOrAnimal } from './playerName';
import { emptyProgress, recordClear } from './progress';
import { defaultSettings } from './settings';
import {
  emptySave,
  loadSave,
  parseSave,
  resetProgress,
  STORAGE_KEY,
  writeSave,
  type KeyValueStore,
} from './storage';

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
};

describe('saving', () => {
  it('round-trips a save', () => {
    const store = memoryStore();
    const save = {
      progress: recordClear(emptyProgress(), 0, 1).progress,
      settings: {
        theme: 'dark' as const,
        colorMode: 'one' as const,
        oneColor: '#00f5d0',
        arrowSpeed: 'fast' as const,
        showDots: true,
        sound: false,
      },
      name: 'Sam',
    };
    expect(writeSave(store, save)).toBe(true);
    expect(loadSave(store)).toEqual(save);
  });

  it('starts empty when nothing is saved', () => {
    expect(loadSave(memoryStore())).toEqual(emptySave());
  });

  it('parseSave returns an empty save for corrupt text', () => {
    expect(parseSave('not json')).toEqual(emptySave());
    expect(parseSave('{corrupted')).toEqual(emptySave());
  });

  it.each(['[]', 'null', '{"progress":5,"settings":"x","name":7}'])(
    'falls back to defaults for bad data: %s',
    (text) => {
      expect(parseSave(text)).toEqual(emptySave());
    },
  );

  it('unlockAll never appears in the saved JSON', () => {
    const store = memoryStore();
    const save = emptySave();
    writeSave(store, save);
    const json = store.getItem(STORAGE_KEY);
    expect(json).not.toBeNull();
    expect(json).not.toContain('unlockAll');
  });

  it('drops invalid levels and clamps a bad last position', () => {
    const text = JSON.stringify({
      progress: {
        cleared: [[3, 3, 1, 0, 201, 'x', 2.5], 'no'],
        hints: -4,
        last: { difficulty: 9, level: 1 },
      },
    });
    const p = parseSave(text).progress;
    expect(p.cleared[0]).toEqual([]);
    expect(p.cleared[1]).toEqual([]);
    expect(p.hints).toBe(3);
    expect(p.last).toEqual({ difficulty: 0, level: 1 });
  });

  it('sorts and de-duplicates cleared levels', () => {
    const text = JSON.stringify({
      progress: { cleared: [[3, 1, 3, 2]] },
    });
    expect(parseSave(text).progress.cleared[0]).toEqual([1, 2, 3]);
  });

  it('reports a refused write instead of throwing', () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(writeSave(full, emptySave())).toBe(false);
  });

  it('uses one versioned key', () => {
    const store = memoryStore();
    writeSave(store, emptySave());
    expect([...store.data.keys()]).toEqual([STORAGE_KEY]);
    expect(STORAGE_KEY).toBe('pointscape:v1');
  });
});

describe('reset progress', () => {
  it('keeps the name and settings (FR-67)', () => {
    const save = {
      progress: recordClear(emptyProgress(), 0, 1).progress,
      settings: {
        theme: 'dark' as const,
        colorMode: 'one' as const,
        oneColor: '#00f5d0',
        arrowSpeed: 'fast' as const,
        showDots: true,
        sound: false,
      },
      name: 'Sam',
    };
    const after = resetProgress(save);
    expect(after.name).toBe('Sam');
    expect(after.settings).toEqual(save.settings);
    expect(after.progress).toEqual(emptyProgress());
  });
});

describe('player name', () => {
  it('trims, collapses spaces and cuts to 16 characters (FR-65)', () => {
    expect(cleanName('  Sam   Lee  ')).toBe('Sam Lee');
    expect(cleanName('a'.repeat(30))).toHaveLength(16);
    expect(cleanName('   ')).toBe('');
  });

  it('keeps markup as plain characters', () => {
    expect(cleanName('<b>x</b>')).toBe('<b>x</b>');
  });

  it('gives an animal for empty input (FR-64)', () => {
    const name = nameOrAnimal('  ', createRng(1));
    expect(ANIMALS).toContain(name);
  });

  it('has at least 20 animals, each short enough', () => {
    expect(ANIMALS.length).toBeGreaterThanOrEqual(20);
    expect(ANIMALS.every((a) => a.length >= 1 && a.length <= 16)).toBe(true);
  });

  it('drops a saved one-color value that is not in the palette', () => {
    const text = JSON.stringify({
      settings: { colorMode: 'one', oneColor: '#123456' },
    });
    expect(parseSave(text).settings.oneColor).toBe(defaultSettings().oneColor);
  });

  it('falls back to the light theme for an unknown theme value', () => {
    const text = JSON.stringify({ settings: { theme: 'neon' } });
    expect(parseSave(text).settings.theme).toBe('light');
  });
});
