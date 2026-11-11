import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { DIFFICULTIES, LEVELS_PER_SIZE, SIZES } from '../core/difficulty';
import type { Level } from '../core/types';
import { emptyProgress } from '../game/progress';
import { defaultSettings } from '../game/settings';
import { accentFor, ACCENTS } from './accents';
import { CoachMark } from './CoachMark';
import { DifficultyScreen } from './DifficultyScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { GameScreen } from './GameScreen';
import { HomeBackdrop } from './HomeBackdrop';
import { HomeScreen } from './HomeScreen';
import { HowToPlayScreen } from './HowToPlayScreen';
import { HelpIcon, PauseIcon, SettingsIcon } from './icons';
import { LevelsScreen } from './LevelsScreen';
import { Loading } from './Loading';
import { Logo } from './Logo';
import { Modal, ModalButton } from './Modal';
import { NameScreen } from './NameScreen';
import { Page } from './Page';
import { SettingsScreen } from './SettingsScreen';
import { Stage } from './Stage';

const sampleLevel: Level = {
  size: 8,
  mask: new Array(64).fill(true),
  arrows: [
    {
      id: 0,
      cells: [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
      dir: { x: 0, y: 1 },
    },
    {
      id: 1,
      cells: [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
      ],
      dir: { x: 1, y: 0 },
    },
  ],
};

describe('accents', () => {
  it('returns accent for each difficulty', () => {
    for (let i = 0; i < ACCENTS.length; i++) {
      expect(accentFor(i)).toEqual(ACCENTS[i]);
    }
    expect(accentFor(99)).toEqual(ACCENTS[0]);
  });
});

describe('Logo', () => {
  it('renders flat Pointscape wordmark and no dimensions subtitle', () => {
    const html = renderToString(React.createElement(Logo));
    expect(html).toContain('Pointscape');
    expect(html).not.toContain(['3', 'D'].join(''));
  });
});

describe('icons', () => {
  it('renders svg icons with base attributes', () => {
    const html = renderToString(
      React.createElement(PauseIcon, { className: 'size-6' }),
    );
    expect(html).toContain('<svg');
    expect(html).toContain('size-6');
    expect(html).toContain('aria-hidden="true"');

    const help = renderToString(React.createElement(HelpIcon));
    expect(help).toContain('<svg');

    const settings = renderToString(React.createElement(SettingsIcon));
    expect(settings).toContain('<svg');
  });
});

describe('CoachMark', () => {
  it('renders hint instructions and button', () => {
    const html = renderToString(
      React.createElement(CoachMark, { onDone: () => {} }),
    );
    expect(html).toContain('Tap an arrow with a clear path');
    expect(html).toContain('Got it');
  });
});

describe('Modal & ModalButton', () => {
  it('renders dialog card with children and buttons', () => {
    const html = renderToString(
      React.createElement(
        Modal,
        null,
        React.createElement(ModalButton, {
          label: 'Continue',
          primary: true,
          onClick: () => {},
        }),
      ),
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Continue');
    expect(html).toContain('bg-teal-300');
  });
});

describe('Loading', () => {
  it('renders loading indicators, title and detail', () => {
    const html = renderToString(
      React.createElement(Loading, {
        label: 'Building level',
        detail: 'Tiny · Level 1',
      }),
    );
    expect(html).toContain('Building level');
    expect(html).toContain('Tiny · Level 1');
    expect(html).toContain('Pointscape');
  });
});

describe('Page', () => {
  it('renders title, back button, top, footer, and children', () => {
    const html = renderToString(
      React.createElement(
        Page,
        {
          title: 'Test Page',
          onBack: () => {},
          top: React.createElement('div', null, 'Top Bar'),
          footer: React.createElement('div', null, 'Footer Content'),
          overlay: true,
        },
        React.createElement('span', null, 'Body Content'),
      ),
    );
    expect(html).toContain('Test Page');
    expect(html).toContain('Top Bar');
    expect(html).toContain('Footer Content');
    expect(html).toContain('Body Content');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="Test Page"');
  });
});

describe('ErrorBoundary', () => {
  it('renders children when normal', () => {
    const html = renderToString(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement('div', null, 'Healthy Content'),
      ),
    );
    expect(html).toContain('Healthy Content');
    expect(html).not.toContain('Something went wrong');
  });

  it('updates state on error', () => {
    expect(ErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });
});

describe('HomeBackdrop & Stage', () => {
  it('renders svg backdrop without extra canvas elements', () => {
    const onReady = vi.fn();
    const html = renderToString(React.createElement(HomeBackdrop, { onReady }));
    expect(html).toContain('<svg');
    expect(html).toContain('home-dots-grid');
    expect(html).not.toContain('canvas');
    expect(html).not.toContain(['3', 'D'].join(''));
  });

  it('renders Stage with children and loading veil', () => {
    const html = renderToString(
      React.createElement(
        Stage,
        { dark: true },
        React.createElement('div', null, 'Stage Child'),
      ),
    );
    expect(html).toContain('Stage Child');
    expect(html).toContain('Loading');
  });
});

describe('NameScreen', () => {
  it('renders welcome screen with input and buttons', () => {
    const html = renderToString(
      React.createElement(NameScreen, { dark: true, onDone: () => {} }),
    );
    expect(html).toContain('Welcome to');
    expect(html).toContain('Pointscape');
    expect(html).toContain('your name?');
    expect(html).toContain('Continue');
    expect(html).toContain('Skip');
  });
});

describe('HomeScreen', () => {
  it('renders greeting, 1,000 total levels and play button', () => {
    const progress = emptyProgress();
    const html = renderToString(
      React.createElement(HomeScreen, {
        dark: true,
        name: 'Fox',
        progress,
        onPlay: () => {},
        onAllLevels: () => {},
        onSettings: () => {},
        onHelp: () => {},
      }),
    );
    expect(html).toContain('Hi, Fox');
    expect(html).toContain('Tap arrows. Clear the board.');
    expect(html).toContain('Play');
    expect(html).toContain('Tiny · Level 1');
    expect(html).toContain('All levels');
    expect(html).toContain('of 1,000 cleared');
    expect(html).toContain('3');
    expect(html).toContain('hints');
  });
});

describe('DifficultyScreen', () => {
  it('renders 5 size rows with grid dimensions', () => {
    const progress = emptyProgress();
    const html = renderToString(
      React.createElement(DifficultyScreen, {
        progress,
        unlockAll: false,
        onPick: () => {},
        onLocked: () => {},
        onBack: () => {},
      }),
    );
    expect(html).toContain('Choose a size');
    for (let i = 0; i < DIFFICULTIES.length; i++) {
      const d = DIFFICULTIES[i];
      const s = SIZES[i];
      if (d && s) {
        expect(html).toContain(d.name);
        expect(html).toContain(`${s}×${s}`);
      }
    }
    // Tiny is unlocked initially
    expect(html).toContain(`0 / ${LEVELS_PER_SIZE} cleared`);
    // Others are locked initially
    expect(html).toContain('0 / 10 to unlock');
  });
});

describe('LevelsScreen', () => {
  it('renders 200 levels and difficulty switcher tabs', () => {
    const progress = emptyProgress();
    const html = renderToString(
      React.createElement(LevelsScreen, {
        difficulty: 0,
        progress,
        unlockAll: false,
        onPickDifficulty: () => {},
        onPlay: () => {},
        onLocked: () => {},
        onBack: () => {},
      }),
    );
    expect(html).toContain('Tiny');
    expect(html).toContain('Unlocks Compact');
    expect(html).toContain('0 / 10');
    // Tab list
    expect(html).toContain('Tiny');
    expect(html).toContain('Level 1');
    expect(html).toContain('Level 200');
  });
});

describe('HowToPlayScreen', () => {
  it('renders 2D instructions without layer or tilt tips', () => {
    const html = renderToString(
      React.createElement(HowToPlayScreen, { onBack: () => {} }),
    );
    expect(html).toContain('Find a clear path');
    expect(html).toContain('Avoid blockers');
    expect(html).toContain('Clear the board');
    expect(html).toContain('Hold an arrow to preview its path');
    expect(html).toContain('Drag to pan around the board.');
    expect(html).toContain('Pinch or use mouse wheel to zoom in and out.');
    expect(html).not.toContain('tilt');
    expect(html).not.toContain('layer');
    expect(html).not.toContain(['3', 'D'].join(''));
  });
});

describe('SettingsScreen', () => {
  it('renders look and play settings, omitting extra toggles', () => {
    const html = renderToString(
      React.createElement(SettingsScreen, {
        name: 'Fox',
        settings: defaultSettings(),
        dev: { on: false, toggle: () => {} },
        onName: () => {},
        onSettings: () => {},
        onReset: () => {},
        onBack: () => {},
      }),
    );
    expect(html).toContain('Settings');
    expect(html).toContain('Fox');
    expect(html).toContain('Theme');
    expect(html).toContain('Arrow colours');
    expect(html).toContain('Arrow speed');
    expect(html).toContain('Show grid dots');
    expect(html).toContain('Sound');
    expect(html).toContain('Reset progress');
    expect(html).toContain('Pointscape. The art and the levels are original.');

    // Dropped settings and credits
    expect(html).not.toContain(['Show', 'lay', 'ers'].join(' '));
    expect(html).not.toContain('Low power mode');
    expect(html).not.toContain(['Pointscape', '3', 'D'].join(' '));
  });
});

describe('App', () => {
  it('renders App shell', () => {
    const html = renderToString(React.createElement(App));
    expect(html).toContain('Pointscape');
  });
});

describe('GameScreen', () => {
  it('renders flat 2D HUD without depth chips', () => {
    const onWin = vi.fn();
    const onHintUsed = vi.fn();

    const html = renderToString(
      React.createElement(GameScreen, {
        board: sampleLevel,
        difficulty: 0,
        level: 1,
        hints: 3,
        onHintUsed,
        onWin,
      }),
    );

    // Shows difficulty name and board size
    const tinyName = DIFFICULTIES[0]?.name ?? 'Tiny';
    expect(html).toContain(tinyName);
    expect(html).toContain('Level 1 · 8×8');

    // Shows hearts (3 lives for tiny)
    expect(html).toContain('❤️❤️❤️');

    // Shows arrows left
    expect(html).toContain('Arrows left');
    expect(html).toContain('2');

    // Shows hint and restart buttons
    expect(html).toContain('💡 3');
    expect(html).toContain('↻ Restart');

    // Shows tip
    expect(html).toContain(
      'Hold an arrow to preview its path without risking a heart.',
    );

    // No depth traces
    expect(html).not.toContain(['3', 'D'].join(''));
    expect(html).not.toContain('0L');
    expect(html).not.toContain('1L');
    expect(html).not.toContain(['Lay', 'ers'].join(''));
    expect(html).not.toContain('Drag to tilt');
  });
});
