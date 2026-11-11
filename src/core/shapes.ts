export interface Shape {
  readonly id: string;
  readonly name: string;
  readonly test: (x: number, y: number) => boolean;
  readonly minSize: number;
}

export const SIZES = [16, 24, 32, 48, 64] as const;

function inpoly(
  x: number,
  y: number,
  poly: readonly (readonly [number, number])[],
): boolean {
  let inside = false;
  let j = poly.length - 1;
  for (let i = 0; i < poly.length; i++) {
    const pi = poly[i];
    const pj = poly[j];
    if (pi && pj) {
      if (
        pi[1] > y !== pj[1] > y &&
        x < ((pj[0] - pi[0]) * (y - pi[1])) / (pj[1] - pi[1]) + pi[0]
      ) {
        inside = !inside;
      }
    }
    j = i;
  }
  return inside;
}

function star(k: number, ri: number, ro: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 2 * k; i++) {
    const r = i % 2 === 0 ? ro : ri;
    pts.push([
      r * Math.sin((i * Math.PI) / k),
      -r * Math.cos((i * Math.PI) / k),
    ]);
  }
  return pts;
}

const HEXAGON_POLY: readonly [number, number][] = Array.from(
  { length: 6 },
  (_, i) => [Math.cos((i * Math.PI) / 3), Math.sin((i * Math.PI) / 3)],
);
const STAR_5_POLY: readonly [number, number][] = star(5, 0.44, 0.95);
const STAR_8_POLY: readonly [number, number][] = star(8, 0.65, 0.9);

export const SHAPES: readonly Shape[] = [
  {
    id: 'square',
    name: 'Square',
    test: () => true,
    minSize: 16,
  },
  {
    id: 'circle',
    name: 'Circle',
    test: (x, y) => x * x + y * y <= 1,
    minSize: 16,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    test: (x, y) => Math.abs(x) + Math.abs(y) <= 1,
    minSize: 16,
  },
  {
    id: 'heart',
    name: 'Heart',
    test: (x, y) =>
      Math.pow(Math.pow(x * 1.25, 2) + Math.pow(-y * 1.25 + 0.15, 2) - 1, 3) -
        Math.pow(x * 1.25, 2) * Math.pow(-y * 1.25 + 0.15, 3) <=
      0,
    minSize: 16,
  },
  {
    id: 'ring',
    name: 'Ring',
    test: (x, y) => {
      const h = Math.hypot(x, y);
      return h >= 0.35 && h <= 1;
    },
    minSize: 16,
  },
  {
    id: 'plus',
    name: 'Plus',
    test: (x, y) => Math.abs(x) <= 0.36 || Math.abs(y) <= 0.36,
    minSize: 16,
  },
  {
    id: 'triangle',
    name: 'Triangle',
    test: (x, y) =>
      inpoly(x, y, [
        [0, -1],
        [1, 0.9],
        [-1, 0.9],
      ]),
    minSize: 16,
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    test: (x, y) => inpoly(x, y, HEXAGON_POLY),
    minSize: 16,
  },
  {
    id: 'star-5',
    name: '5-Point Star',
    test: (x, y) => inpoly(x, y, STAR_5_POLY),
    minSize: 16,
  },
  {
    id: 'star-8',
    name: '8-Point Star',
    test: (x, y) => inpoly(x, y, STAR_8_POLY),
    minSize: 16,
  },
  {
    id: 'crescent',
    name: 'Crescent',
    test: (x, y) => Math.hypot(x, y) <= 1 && Math.hypot(x - 0.45, y) > 0.8,
    minSize: 16,
  },
  {
    id: 'hourglass',
    name: 'Hourglass',
    test: (x, y) => Math.abs(x) <= Math.abs(y) * 0.9 + 0.12,
    minSize: 16,
  },
  {
    id: 'x-shape',
    name: 'X',
    test: (x, y) => Math.abs(Math.abs(x) - Math.abs(y)) <= 0.3,
    minSize: 16,
  },
  {
    id: 'l-shape',
    name: 'L',
    test: (x, y) => x <= -0.2 || y >= 0.2,
    minSize: 16,
  },
  {
    id: 't-shape',
    name: 'T',
    test: (x, y) => y <= -0.45 || Math.abs(x) <= 0.3,
    minSize: 16,
  },
  {
    id: 'u-shape',
    name: 'U',
    test: (x, y) => Math.abs(x) >= 0.5 || y >= 0.5,
    minSize: 16,
  },
  {
    id: 'house',
    name: 'House',
    test: (x, y) =>
      inpoly(x, y, [
        [0, -1],
        [1, -0.1],
        [-1, -0.1],
      ]) ||
      (Math.abs(x) <= 0.8 && y >= -0.1),
    minSize: 16,
  },
  {
    id: 'arrow-up',
    name: 'Up Arrow',
    test: (x, y) =>
      inpoly(x, y, [
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) ||
      (Math.abs(x) <= 0.35 && y >= 0 && y <= 1),
    minSize: 16,
  },
  {
    id: 'flower',
    name: 'Flower',
    test: (x, y) =>
      Math.hypot(x, y) <=
        0.3 + 0.7 * Math.abs(Math.cos(2.5 * Math.atan2(y, x))) &&
      Math.hypot(x, y) <= 1,
    minSize: 16,
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    test: (x, y) =>
      Math.hypot(x - 0.5, y + 0.35) <= 0.55 ||
      Math.hypot(x + 0.5, y + 0.35) <= 0.55 ||
      Math.hypot(x - 0.42, y - 0.42) <= 0.45 ||
      Math.hypot(x + 0.42, y - 0.42) <= 0.45 ||
      Math.abs(x) <= 0.08,
    minSize: 16,
  },
  {
    id: 'droplet',
    name: 'Droplet',
    test: (x, y) =>
      inpoly(x, y, [
        [0, -1],
        [0.65, 0.2],
        [-0.65, 0.2],
      ]) || Math.hypot(x, y - 0.3) <= 0.7,
    minSize: 16,
  },
  {
    id: 'shield',
    name: 'Shield',
    test: (x, y) =>
      (y <= 0.2 && Math.abs(x) <= 0.85) ||
      (Math.hypot(x / 0.85, (y - 0.2) / 0.8) <= 1 && y > 0.2),
    minSize: 16,
  },
  {
    id: 'cloud',
    name: 'Cloud',
    test: (x, y) =>
      Math.hypot(x + 0.45, y - 0.1) <= 0.45 ||
      Math.hypot(x - 0.1, y + 0.15) <= 0.55 ||
      Math.hypot(x - 0.55, y - 0.1) <= 0.4 ||
      (Math.abs(x) <= 0.8 && y >= 0.1 && y <= 0.55),
    minSize: 16,
  },
  {
    id: 'two-blobs',
    name: 'Two Blobs',
    test: (x, y) =>
      Math.hypot(x + 0.5, y) <= 0.48 ||
      Math.hypot(x - 0.5, y) <= 0.48 ||
      (Math.abs(x) <= 0.2 && Math.abs(y) <= 0.18),
    minSize: 16,
  },
  {
    id: 'spiral',
    name: 'Spiral',
    test: (x, y) =>
      Math.hypot(x, y) <= 0.9 &&
      (Math.hypot(x, y) <= 0.25 ||
        Math.cos(Math.atan2(y, x) - Math.hypot(x, y) * 3.5) >= -0.2),
    minSize: 16,
  },
  {
    id: 'checker-blocks',
    name: 'Checker Blocks',
    test: (x, y) =>
      (Math.abs(x) <= 0.35 && Math.abs(y) <= 0.35) ||
      (Math.abs(x) >= 0.3 &&
        Math.abs(x) <= 0.85 &&
        Math.abs(y) >= 0.3 &&
        Math.abs(y) <= 0.85) ||
      (Math.abs(Math.abs(x) - Math.abs(y)) <= 0.15 &&
        Math.max(Math.abs(x), Math.abs(y)) <= 0.85),
    minSize: 16,
  },
  {
    id: 'frame',
    name: 'Frame',
    test: (x, y) => Math.max(Math.abs(x), Math.abs(y)) >= 0.55,
    minSize: 16,
  },
  {
    id: 'octagon',
    name: 'Octagon',
    test: (x, y) =>
      Math.abs(x) + Math.abs(y) <= 1.45 &&
      Math.max(Math.abs(x), Math.abs(y)) <= 1,
    minSize: 16,
  },
  {
    id: 'lightning',
    name: 'Lightning',
    test: (x, y) =>
      inpoly(x, y, [
        [0.15, -0.85],
        [-0.6, 0.1],
        [-0.05, 0.1],
        [-0.3, 0.85],
        [0.65, -0.2],
        [0.05, -0.2],
      ]),
    minSize: 24,
  },
  {
    id: 'fish',
    name: 'Fish',
    test: (x, y) =>
      Math.hypot((x + 0.15) / 0.8, y / 0.5) <= 1 ||
      inpoly(x, y, [
        [0.55, 0],
        [1, -0.5],
        [1, 0.5],
      ]),
    minSize: 16,
  },
  {
    id: 'cat-head',
    name: 'Cat Head',
    test: (x, y) =>
      Math.hypot(x, y + 0.05) <= 0.8 ||
      inpoly(x, y, [
        [-0.8, -0.2],
        [-0.75, -1],
        [-0.2, -0.62],
      ]) ||
      inpoly(x, y, [
        [0.8, -0.2],
        [0.75, -1],
        [0.2, -0.62],
      ]),
    minSize: 16,
  },
  {
    id: 'tree',
    name: 'Tree',
    test: (x, y) =>
      inpoly(x, y, [
        [0, -1],
        [0.7, -0.2],
        [-0.7, -0.2],
      ]) ||
      inpoly(x, y, [
        [0, -0.5],
        [0.9, 0.4],
        [-0.9, 0.4],
      ]) ||
      (Math.abs(x) <= 0.15 && y >= 0.4),
    minSize: 16,
  },
  {
    id: 'moon-dot',
    name: 'Moon with Dot',
    test: (x, y) =>
      (Math.hypot(x, y) <= 0.98 &&
        Math.hypot(x - 0.45, y) > 0.8 &&
        Math.abs(y) <= 0.78) ||
      Math.hypot(x - 0.5, y) <= 0.22 ||
      (Math.abs(y) <= 0.15 && x >= -0.4 && x <= 0.5),
    minSize: 16,
  },
];

export function maskFor(shape: Shape, size: number): boolean[] {
  const mask = new Array<boolean>(size * size);
  const c = (size - 1) / 2;
  const denom = c + 0.5;
  for (let j = 0; j < size; j++) {
    const y = (j - c) / denom;
    const rowOffset = j * size;
    for (let i = 0; i < size; i++) {
      const x = (i - c) / denom;
      mask[rowOffset + i] = shape.test(x, y);
    }
  }
  return mask;
}

export function isConnected(mask: readonly boolean[], size: number): boolean {
  if (size <= 0 || mask.length !== size * size) {
    return false;
  }

  let totalCount = 0;
  let startIndex = -1;

  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      totalCount++;
      if (startIndex === -1) {
        startIndex = i;
      }
    }
  }

  if (totalCount === 0 || startIndex === -1) {
    return false;
  }

  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(totalCount);
  let head = 0;
  let tail = 0;

  queue[tail++] = startIndex;
  visited[startIndex] = 1;
  let visitedCount = 0;

  while (head < tail) {
    const curr = queue[head++];
    if (curr === undefined) {
      break;
    }
    visitedCount++;

    const x = curr % size;
    const y = Math.floor(curr / size);

    // Left
    if (x > 0) {
      const next = curr - 1;
      if (mask[next] && !visited[next]) {
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    // Right
    if (x < size - 1) {
      const next = curr + 1;
      if (mask[next] && !visited[next]) {
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    // Up
    if (y > 0) {
      const next = curr - size;
      if (mask[next] && !visited[next]) {
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    // Down
    if (y < size - 1) {
      const next = curr + size;
      if (mask[next] && !visited[next]) {
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
  }

  return visitedCount === totalCount;
}

export function shapeFor(sizeIndex: number, level: number): Shape {
  const fallback = SHAPES[0];
  if (!fallback) {
    throw new Error('SHAPES is empty');
  }
  if (level <= 10) {
    return fallback;
  }
  const size = SIZES[sizeIndex] ?? SIZES[0] ?? 16;
  const allowed = SHAPES.filter((s) => s.minSize <= size);
  if (allowed.length === 0) {
    return fallback;
  }
  const index =
    (((level - 11) % allowed.length) + allowed.length) % allowed.length;
  const picked = allowed[index];
  return picked ?? fallback;
}
