import type { Arrow, Level, Vec } from '../core/types';

function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq),
  );
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function distToArrow(arrow: Arrow, p: Vec): number {
  if (arrow.cells.length === 0) return Infinity;
  if (arrow.cells.length === 1) {
    const c = arrow.cells[0];
    if (!c) return Infinity;
    return Math.hypot(p.x - (c.x + 0.5), p.y - (c.y + 0.5));
  }
  let minDist = Infinity;
  for (let i = 0; i < arrow.cells.length - 1; i++) {
    const c0 = arrow.cells[i];
    const c1 = arrow.cells[i + 1];
    if (!c0 || !c1) continue;
    const a = { x: c0.x + 0.5, y: c0.y + 0.5 };
    const b = { x: c1.x + 0.5, y: c1.y + 0.5 };
    const d = distToSegment(p, a, b);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export function pickArrow(
  level: Level,
  idleIds: ReadonlySet<number>,
  cellPoint: Vec,
  cellSizePx: number,
): number | undefined {
  if (idleIds.size === 0 || level.arrows.length === 0) return undefined;

  const idleArrows = level.arrows.filter((a) => idleIds.has(a.id));
  if (idleArrows.length === 0) return undefined;

  const cellOwner = new Map<string, number>();
  for (const arrow of idleArrows) {
    for (const c of arrow.cells) {
      cellOwner.set(`${c.x},${c.y}`, arrow.id);
    }
  }

  let bestId: number | undefined = undefined;
  let bestDist = Infinity;

  for (const arrow of idleArrows) {
    let isolated = true;
    for (const c of arrow.cells) {
      for (let dy = -1; dy <= 1 && isolated; dy++) {
        for (let dx = -1; dx <= 1 && isolated; dx++) {
          if (dx === 0 && dy === 0) continue;
          const neighborOwner = cellOwner.get(`${c.x + dx},${c.y + dy}`);
          if (neighborOwner !== undefined && neighborOwner !== arrow.id) {
            isolated = false;
          }
        }
      }
      if (!isolated) break;
    }

    const leniency = isolated ? 0.75 : 0.25;
    const minTol = cellSizePx > 0 ? 10 / cellSizePx : 0;
    const hitRadius = Math.max(leniency, minTol);

    const dist = distToArrow(arrow, cellPoint);
    if (dist <= hitRadius && dist < bestDist) {
      bestDist = dist;
      bestId = arrow.id;
    }
  }

  return bestId;
}
