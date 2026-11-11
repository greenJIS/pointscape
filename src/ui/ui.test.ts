import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DIFFICULTIES } from '../core/difficulty';
import type { Level } from '../core/types';
import { accentFor, ACCENTS } from './accents';
import { CoachMark } from './CoachMark';
import { GameScreen } from './GameScreen';
import { HelpIcon, PauseIcon, SettingsIcon } from './icons';
import { Loading } from './Loading';
import { Logo } from './Logo';
import { Modal, ModalButton } from './Modal';

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
  it('renders flat Pointscape wordmark and no 3D subtitle', () => {
    const html = renderToString(React.createElement(Logo));
    expect(html).toContain('Pointscape');
    expect(html).not.toContain('3D');
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

describe('GameScreen', () => {
  it('renders flat 2D HUD without 3D or layer chips', () => {
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

    // No 3D / layer traces
    expect(html).not.toContain('3D');
    expect(html).not.toContain('0L');
    expect(html).not.toContain('1L');
    expect(html).not.toContain('Layers');
    expect(html).not.toContain('Drag to tilt');
  });
});
