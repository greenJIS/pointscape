import { exitRay, headOf } from '../core/board';
import type { Arrow, Level, Vec } from '../core/types';
import { v } from '../core/vec';

export const ANIM = {
  /** Exit slide: start speed (cells per second) and acceleration (cells per second squared). */
  speed: 8,
  acc: 40,
  /** Seconds the reset-view button takes to turn the board back. */
  viewReset: 0.5,
  /** Bounce: seconds going forward, then coming back. */
  forward: 0.12,
  back: 0.12,
  /** Blocker jiggle: one sine hump, this long and this far. */
  jiggle: 0.22,
  jiggleSize: 0.1,
  /** Blocked flash: fully red, then fading back to the arrow colour. */
  flashFull: 0.25,
  flashFade: 0.35,
  /** Hint: one pulse toward white with a wider head. */
  hintTime: 0.9,
  hintWhite: 0.55,
  hintHead: 0.4,
  /** Hold this long to preview an arrow's path. */
  hold: 0.35,
  /** A cleared arrow stays in the board's list this long to finish its slide. */
  exitHold: 0.32,
  /** The blocked flash stays on for this long. */
  flashHold: 0.4,
  /** Win and lose modal delays. */
  winCard: 0.3,
  loseCard: 0.65,
  /** Grid dots fade. */
  dotFade: 0.2,
  dotNear: 0.42,
  /** Zoom limits. */
  zoomMin: 1,
  zoomMax: 8,
  /** A blocked arrow stops this far short of the blocker's cell. */
  bumpGap: 0.8,
} as const;

export const slideDistance = (t: number, rate = 1): number => {
  const s = t * rate;
  return ANIM.speed * s + 0.5 * ANIM.acc * s * s;
};

export const bumpDistance = (blockerCells: number): number =>
  blockerCells - ANIM.bumpGap;

export function bodyLength(arrow: Arrow): number {
  return Math.max(0, arrow.cells.length - 1);
}

export function exitDistance(level: Pick<Level, 'size'>, arrow: Arrow): number {
  return exitRay(level, arrow).length + 1;
}

export function finishDistance(
  level: Pick<Level, 'size'>,
  arrow: Arrow,
): number {
  return bodyLength(arrow) + exitDistance(level, arrow);
}

export function arrowPath(level: Pick<Level, 'size'>, arrow: Arrow): Vec[] {
  const head = headOf(arrow);
  const exitCells = exitDistance(level, arrow);
  const bLength = bodyLength(arrow);
  const reach = exitCells + bLength + 2;
  const centers = arrow.cells.map((c) => v(c.x + 0.5, c.y + 0.5));
  const headCenter =
    centers[centers.length - 1] ?? v(head.x + 0.5, head.y + 0.5);
  const far = v(
    headCenter.x + arrow.dir.x * reach,
    headCenter.y + arrow.dir.y * reach,
  );
  return [...centers, far];
}

export function subPath(
  points: readonly Vec[],
  from: number,
  to: number,
): Vec[] {
  if (points.length < 2) return [...points];
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    cum.push((cum[i - 1] ?? 0) + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cum[cum.length - 1] ?? 0;
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  const s0 = Math.max(0, Math.min(total, lo));
  const s1 = Math.max(0, Math.min(total, hi));

  const at = (s: number): Vec => {
    let i = 0;
    while (i < cum.length - 2 && (cum[i + 1] ?? 0) < s) i++;
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) throw new Error('path has fewer than two points');
    const span = (cum[i + 1] ?? 0) - (cum[i] ?? 0);
    const t = span === 0 ? 0 : (s - (cum[i] ?? 0)) / span;
    return v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  };

  const out: Vec[] = [at(s0)];
  points.forEach((p, i) => {
    const c = cum[i] ?? 0;
    if (c > s0 + 1e-6 && c < s1 - 1e-6) out.push(p);
  });
  out.push(at(s1));
  return out;
}
