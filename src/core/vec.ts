import type { Vec } from './types';

export const v = (x: number, y: number): Vec => ({ x, y });

export const add = (a: Vec, b: Vec): Vec => v(a.x + b.x, a.y + b.y);

export const sub = (a: Vec, b: Vec): Vec => v(a.x - b.x, a.y - b.y);

export const neg = (a: Vec): Vec => v(-a.x, -a.y);

export const eq = (a: Vec, b: Vec): boolean => a.x === b.x && a.y === b.y;

export const key = (a: Vec): string => `${a.x},${a.y}`;

export const UP: Vec = v(0, -1);
export const DOWN: Vec = v(0, 1);
export const LEFT: Vec = v(-1, 0);
export const RIGHT: Vec = v(1, 0);

export const DIRS: readonly Vec[] = [UP, DOWN, LEFT, RIGHT];
