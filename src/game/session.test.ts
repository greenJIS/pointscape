import { describe, expect, it } from 'vitest';
import type { Level } from '../core/types';
import { LEFT, RIGHT, UP, v } from '../core/vec';
import {
  arrowsLeft,
  hintFor,
  livesFor,
  restart,
  startSession,
  STARTING_LIVES,
  tap,
} from './session';

// Arrow 0 points right and is blocked by arrow 1. Arrow 1 points up and is free.
// Arrow 2 points left, is free, and sits away from the others.
const level: Level = {
  size: 6,
  mask: new Array(36).fill(true),
  arrows: [
    { id: 0, cells: [v(0, 0), v(1, 0)], dir: RIGHT },
    { id: 1, cells: [v(3, 1), v(3, 0)], dir: UP },
    { id: 2, cells: [v(3, 5), v(2, 5)], dir: LEFT },
  ],
};

describe('tap', () => {
  it('removes a free arrow without costing a life (FR-5)', () => {
    const r = tap(startSession(level), 1);
    expect(r.outcome).toBe('exit');
    expect(r.session.alive.has(1)).toBe(false);
    expect(r.session.lives).toBe(STARTING_LIVES);
  });

  it('keeps a blocked arrow and costs one life, naming the blocker (FR-6)', () => {
    const r = tap(startSession(level), 0);
    expect(r.outcome).toBe('blocked');
    expect(r.blockerId).toBe(1);
    expect(r.lifeLost).toBe(true);
    expect(r.session.lives).toBe(STARTING_LIVES - 1);
    expect(r.session.alive.has(0)).toBe(true);
  });

  it('costs a life only once per arrow', () => {
    const once = tap(startSession(level), 0).session;
    const twice = tap(once, 0);
    expect(twice.outcome).toBe('blocked');
    expect(twice.lifeLost).toBe(false);
    expect(twice.session.lives).toBe(STARTING_LIVES - 1);
  });

  it('frees an arrow once its blocker is gone', () => {
    const s = tap(startSession(level), 1).session;
    expect(tap(s, 0).outcome).toBe('exit');
  });

  it('tap on an already removed arrow is ignored', () => {
    const s = tap(startSession(level), 1).session;
    expect(tap(s, 1).outcome).toBe('ignored');
    expect(tap(s, 99).outcome).toBe('ignored');
  });

  it('does not change the session it was given', () => {
    const s = startSession(level);
    tap(s, 1);
    tap(s, 0);
    expect(s).toEqual(startSession(level));
  });
});

describe('winning and losing', () => {
  it('wins when the last arrow leaves (FR-8)', () => {
    let s = startSession(level);
    for (const id of [1, 0, 2]) s = tap(s, id).session;
    expect(s.status).toBe('won');
    expect(arrowsLeft(s)).toHaveLength(0);
  });

  it('loses at zero lives (FR-7)', () => {
    // Three arrows, all blocked, so each tap costs a life.
    const jam: Level = {
      size: 6,
      mask: new Array(36).fill(true),
      arrows: [
        { id: 0, cells: [v(0, 0), v(1, 0)], dir: RIGHT },
        { id: 1, cells: [v(0, 1), v(1, 1)], dir: RIGHT },
        { id: 2, cells: [v(0, 2), v(1, 2)], dir: RIGHT },
        { id: 3, cells: [v(4, 0), v(4, 1), v(4, 2)], dir: UP },
        { id: 4, cells: [v(3, 0), v(3, 1), v(3, 2)], dir: UP },
      ],
    };
    let s = startSession(jam);
    for (const id of [0, 1, 2]) s = tap(s, id).session;
    expect(s.lives).toBe(0);
    expect(s.status).toBe('lost');
    expect(tap(s, 3).outcome).toBe('ignored');
  });
});

describe('hint and restart', () => {
  it('hints a free arrow, and nothing once the level is over', () => {
    expect(hintFor(startSession(level))).toBe(1);
    let s = startSession(level);
    for (const id of [1, 0, 2]) s = tap(s, id).session;
    expect(hintFor(s)).toBeUndefined();
  });

  it('restart brings back every arrow and every life', () => {
    let s = startSession(level);
    s = tap(tap(s, 0).session, 1).session;
    expect(restart(s)).toEqual(startSession(level));
  });

  it('gives more lives to larger sizes', () => {
    expect([0, 1, 2, 3, 4].map(livesFor)).toEqual([3, 4, 5, 6, 7]);
    expect(livesFor(99)).toBe(3);
  });

  it('keeps the size lives on restart', () => {
    const s = startSession(level, livesFor(4));
    expect(restart(s).lives).toBe(7);
    expect(restart(s).maxLives).toBe(7);
  });
});
