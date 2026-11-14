import type { Arrow, Level, Vec } from '../core/types';
import type { Camera, Viewport } from './camera';
import { cellSize } from './camera';
import {
  ANIM,
  arrowPath,
  bodyLength,
  finishDistance,
  slideDistance,
  subPath,
} from './motion';
import { POOL } from './palette';
import type { ThemeColors } from './theme';

export interface ActiveSlide {
  readonly arrowId: number;
  readonly t0: number;
  readonly rate?: number;
}

export interface ActiveBump {
  readonly arrowId: number;
  readonly t0: number;
  readonly bumpDist: number;
}

export interface ActiveJiggle {
  readonly arrowId: number;
  readonly t0: number;
  readonly dir: Vec;
}

export interface ActiveFlash {
  readonly arrowId: number;
  readonly t0: number;
}

export interface HoldPreview {
  readonly arrowId: number;
  readonly blocked: boolean;
  readonly reach: number;
}

export interface WinRipple {
  readonly t0: number;
  readonly origin?: Vec | null;
}

export interface DrawState {
  readonly level: Level;
  readonly cam: Camera;
  readonly viewport: Viewport;
  readonly colors: readonly string[];
  readonly theme: ThemeColors;
  readonly idleIds?: ReadonlySet<number>;
  readonly showDots?: boolean;
  /** Clip to a rounded box with a faint border, so the board stays inside a fixed box. */
  readonly frame?: boolean;
  readonly hintId?: number | null;
  readonly hintStart?: number;
  readonly slides?: ReadonlyMap<number, ActiveSlide>;
  readonly bumps?: ReadonlyMap<number, ActiveBump>;
  readonly jiggles?: ReadonlyMap<number, ActiveJiggle>;
  readonly flashes?: ReadonlyMap<number, ActiveFlash>;
  readonly holdPreview?: HoldPreview | null;
  readonly winRipple?: WinRipple | null;
}

function parseHex(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = parseHex(c1);
  const [r2, g2, b2] = parseHex(c2);
  const clamped = Math.max(0, Math.min(1, t));
  return rgbToHex(
    r1 + (r2 - r1) * clamped,
    g1 + (g2 - g1) * clamped,
    b1 + (b2 - b1) * clamped,
  );
}

export function darkenColor(color: string, amount = 0.45): string {
  const [r, g, b] = parseHex(color);
  const factor = 1 - Math.max(0, Math.min(1, amount));
  return rgbToHex(r * factor, g * factor, b * factor);
}

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

const RIPPLE_TIME = 0.55;
const RIPPLE_DELAY = 0.035;

export function drawMaskDots(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  now: number,
): void {
  const { level, theme, winRipple } = state;
  const size = level.size;
  const mask = level.mask;
  const baseRadius = 0.07;

  if (!winRipple) {
    if (state.showDots === false) return;
    ctx.beginPath();
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (mask[y * size + x]) {
          const cx = x + 0.5;
          const cy = y + 0.5;
          ctx.moveTo(cx + baseRadius, cy);
          ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
        }
      }
    }
    ctx.fillStyle = theme.dot;
    ctx.fill();
    return;
  }

  // Win ripple active: separate normal dots and rippling dots
  const rippleT0 = winRipple.t0;
  const o = winRipple.origin;

  ctx.beginPath();
  const ripplingDots: { x: number; y: number; r: number; color: string }[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!mask[y * size + x]) continue;
      const reach = o ? Math.hypot(x - o.x, y - o.y) : x + y;
      const u = (now - rippleT0 - reach * RIPPLE_DELAY) / RIPPLE_TIME;
      const cx = x + 0.5;
      const cy = y + 0.5;

      if (u > 0 && u < 1) {
        const bump = easeOutBack(Math.min(1, u * 1.2)) * (1 - u);
        const r = baseRadius * (1 + (bump * 0.22) / 0.07);
        const color = POOL[(x + y) % POOL.length] ?? theme.ok;
        ripplingDots.push({ x: cx, y: cy, r, color });
      } else if (state.showDots !== false) {
        ctx.moveTo(cx + baseRadius, cy);
        ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
      }
    }
  }
  if (state.showDots !== false) {
    ctx.fillStyle = theme.dot;
    ctx.fill();
  }

  // Draw rippling dots grouped by color or individual fill
  for (const dot of ripplingDots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
    ctx.fillStyle = dot.color;
    ctx.fill();
  }
}

interface PreparedArrow {
  readonly arrow: Arrow;
  readonly points: readonly Vec[];
  readonly headPoints: readonly Vec[];
  readonly color: string;
  readonly edgeColor: string;
}

export function drawArrows(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  now: number,
): void {
  const {
    level,
    colors,
    theme,
    idleIds,
    hintId,
    hintStart = 0,
    slides,
    bumps,
    jiggles,
    flashes,
    cam,
    viewport,
  } = state;

  const cSize = cellSize(cam, viewport, level.size);
  const minWidth = cSize > 0 ? 1.5 / cSize : 0.3;
  const edgeWidth = Math.max(0.3, minWidth);
  const coreWidth = edgeWidth * (0.2 / 0.3);
  const glintWidth = edgeWidth * (0.05 / 0.3);
  const shadowWidth = edgeWidth;
  const headStrokeWidth = edgeWidth * (0.1 / 0.3);

  const prepared: PreparedArrow[] = [];

  for (const arrow of level.arrows) {
    const isIdle = idleIds ? idleIds.has(arrow.id) : true;
    const slide = slides?.get(arrow.id);
    const bump = bumps?.get(arrow.id);
    const jiggle = jiggles?.get(arrow.id);

    if (!isIdle && !slide && !bump && !jiggle) {
      continue;
    }

    let offset = 0;

    if (slide) {
      const t = now - slide.t0;
      offset = slideDistance(t, slide.rate ?? 1);
      const finish = finishDistance(level, arrow);
      if (offset >= finish) {
        continue;
      }
    } else if (bump) {
      const t = now - bump.t0;
      if (t < ANIM.forward) {
        const k = Math.max(0, Math.min(1, t / ANIM.forward));
        offset = bump.bumpDist * (1 - (1 - k) * (1 - k));
      } else {
        const k = Math.max(
          0,
          Math.min(1, (t - ANIM.forward) / Math.max(0.001, ANIM.back)),
        );
        const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        offset = bump.bumpDist * (1 - ease);
      }
    }

    let jiggleX = 0;
    let jiggleY = 0;
    if (jiggle && now >= jiggle.t0 && now < jiggle.t0 + ANIM.jiggle) {
      const k = (now - jiggle.t0) / ANIM.jiggle;
      const amp = Math.sin(k * Math.PI) * ANIM.jiggleSize;
      jiggleX = jiggle.dir.x * amp;
      jiggleY = jiggle.dir.y * amp;
    }

    const fullPath = arrowPath(level, arrow);
    const bLen = bodyLength(arrow);
    const rawPts = subPath(fullPath, offset, offset + bLen);
    const points: Vec[] = rawPts.map((p) => ({
      x: p.x + jiggleX,
      y: p.y + jiggleY,
    }));

    const headCenter = points[points.length - 1];
    if (!headCenter) continue;

    // Hint animation
    const isHint = hintId === arrow.id;
    let headScale = 1;
    let hintWhiteFactor = 0;
    if (isHint) {
      const pulse = Math.abs(
        Math.sin(((now - hintStart) / ANIM.hintTime) * Math.PI),
      );
      headScale = 1 + ANIM.hintHead * pulse;
      hintWhiteFactor = ANIM.hintWhite * pulse;
    }

    const dx = arrow.dir.x;
    const dy = arrow.dir.y;
    const cx = headCenter.x;
    const cy = headCenter.y;

    const headPoints: Vec[] = [
      { x: cx + dx * 0.45 * headScale, y: cy + dy * 0.45 * headScale },
      {
        x: cx + (-dx * 0.03 - dy * 0.36) * headScale,
        y: cy + (-dy * 0.03 + dx * 0.36) * headScale,
      },
      {
        x: cx + dx * 0.09 * headScale,
        y: cy + dy * 0.09 * headScale,
      },
      {
        x: cx + (-dx * 0.03 + dy * 0.36) * headScale,
        y: cy + (-dy * 0.03 - dx * 0.36) * headScale,
      },
    ];

    let baseColor =
      colors[arrow.id] ?? POOL[arrow.id % POOL.length] ?? '#ffffff';

    const flash = flashes?.get(arrow.id);
    if (flash) {
      const t = now - flash.t0;
      if (t >= 0 && t < ANIM.flashFull + ANIM.flashFade) {
        const k =
          t < ANIM.flashFull ? 1 : 1 - (t - ANIM.flashFull) / ANIM.flashFade;
        baseColor = lerpColor(baseColor, theme.blocked, k);
      }
    }

    if (hintWhiteFactor > 0) {
      baseColor = lerpColor(baseColor, '#ffffff', hintWhiteFactor);
    }

    const edgeColor = darkenColor(baseColor, 0.45);

    prepared.push({
      arrow,
      points,
      headPoints,
      color: baseColor,
      edgeColor,
    });
  }

  if (prepared.length === 0) return;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Each pass groups arrows by style and strokes them in one path. A path
  // call per arrow is far too slow on a 64x64 board with hundreds of arrows.
  const bodies = (shift: Vec, group: readonly PreparedArrow[]): void => {
    for (const item of group) {
      const [first, ...rest] = item.points;
      if (!first || rest.length === 0) continue;
      ctx.moveTo(first.x + shift.x, first.y + shift.y);
      for (const pt of rest) ctx.lineTo(pt.x + shift.x, pt.y + shift.y);
    }
  };
  const heads = (shift: Vec, group: readonly PreparedArrow[]): void => {
    for (const item of group) {
      const [first, ...rest] = item.headPoints;
      if (!first) continue;
      ctx.moveTo(first.x + shift.x, first.y + shift.y);
      for (const pt of rest) ctx.lineTo(pt.x + shift.x, pt.y + shift.y);
      ctx.closePath();
    }
  };
  const groupBy = (
    key: (item: PreparedArrow) => string,
  ): Map<string, PreparedArrow[]> => {
    const groups = new Map<string, PreparedArrow[]>();
    for (const item of prepared) {
      const k = key(item);
      const g = groups.get(k);
      if (g) g.push(item);
      else groups.set(k, [item]);
    }
    return groups;
  };

  const none: Vec = { x: 0, y: 0 };
  const shadow: Vec = { x: 0.06, y: 0.1 };
  const glint: Vec = { x: -0.04, y: -0.04 };

  // Pass 1: Drop shadows
  ctx.beginPath();
  bodies(shadow, prepared);
  ctx.lineWidth = shadowWidth;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.stroke();
  ctx.beginPath();
  heads(shadow, prepared);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fill();

  // Pass 2: Outer edge
  for (const [color, group] of groupBy((i) => i.edgeColor)) {
    ctx.beginPath();
    bodies(none, group);
    ctx.lineWidth = edgeWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.beginPath();
    heads(none, group);
    ctx.lineWidth = headStrokeWidth;
    ctx.stroke();
  }

  // Pass 3: Core fill
  for (const [color, group] of groupBy((i) => i.color)) {
    ctx.beginPath();
    bodies(none, group);
    ctx.lineWidth = coreWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.beginPath();
    heads(none, group);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // Pass 4: Glint highlight
  ctx.beginPath();
  bodies(glint, prepared);
  ctx.lineWidth = glintWidth;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.stroke();

  // The head gets the same gloss: a thin highlight on its upper edges, inset
  // from the rim and nudged toward the light like the body's.
  ctx.beginPath();
  for (const item of prepared) {
    const [tip, left, notch] = item.headPoints;
    if (!tip || !left || !notch) continue;
    const mx = (tip.x + left.x + notch.x) / 3;
    const my = (tip.y + left.y + notch.y) / 3;
    const inset = (v: Vec): Vec => ({
      x: mx + (v.x - mx) * 0.6 + glint.x,
      y: my + (v.y - my) * 0.6 + glint.y,
    });
    const a = inset(tip);
    const b = inset(left);
    const c = inset(notch);
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(a.x, a.y);
  }
  ctx.lineWidth = glintWidth;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.stroke();
}

export function drawHoldPreview(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
): void {
  const { holdPreview, level, theme, cam, viewport } = state;
  if (!holdPreview) return;

  const arrow = level.arrows.find((a) => a.id === holdPreview.arrowId);
  if (!arrow) return;

  const headCell = arrow.cells[arrow.cells.length - 1];
  if (!headCell) return;

  const cSize = cellSize(cam, viewport, level.size);
  const minWidth = cSize > 0 ? 1.2 / cSize : 0.08;
  const lineWidth = Math.max(0.08, minWidth);

  const startX = headCell.x + 0.5;
  const startY = headCell.y + 0.5;
  const endX = startX + arrow.dir.x * holdPreview.reach;
  const endY = startY + arrow.dir.y * holdPreview.reach;

  ctx.save();
  ctx.setLineDash([0.2, 0.2]);
  ctx.strokeStyle = holdPreview.blocked ? theme.blocked : theme.ok;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function draw(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  now: number,
): void {
  const { level, cam, viewport, theme } = state;
  const cSize = cellSize(cam, viewport, level.size);
  const boardW = level.size * cSize;
  const boardH = level.size * cSize;
  const originX = viewport.width / 2 + cam.panX - boardW / 2;
  const originY = viewport.height / 2 + cam.panY - boardH / 2;

  ctx.save();
  ctx.fillStyle = theme.board;
  if (state.frame) {
    // The box is fixed: zoom and pan move the board inside it, never the box.
    const w = viewport.width;
    const h = viewport.height;
    const radius = Math.min(w, h) * 0.015;
    const pad = viewport.pad ?? 0;
    ctx.strokeStyle = theme.dot;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, radius);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Zoomed arrows stop at the padding, so it stays the same at every zoom.
    ctx.beginPath();
    ctx.roundRect(
      pad,
      pad,
      w - 2 * pad,
      h - 2 * pad,
      Math.max(0, radius - pad),
    );
    ctx.clip();
  } else {
    ctx.fillRect(0, 0, viewport.width, viewport.height);
  }

  ctx.translate(originX, originY);
  ctx.scale(cSize, cSize);

  if (state.showDots !== false || state.winRipple) {
    drawMaskDots(ctx, state, now);
  }

  drawArrows(ctx, state, now);

  if (state.holdPreview) {
    drawHoldPreview(ctx, state);
  }

  ctx.restore();
}
