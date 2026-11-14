import type { Vec } from '../core/types';

export interface Camera {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

/** The canvas size, plus padding the fitted board must stay out of (HUD rows). */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly inset?: Insets;
  /** Shrink the area to a fixed centred square, the box the board zooms and pans inside. */
  readonly square?: boolean;
  /** Padding between the box edge and the fitted board, in pixels. */
  readonly pad?: number;
}

export interface Area {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** The inset rectangle in canvas pixels. Never smaller than 1px. */
export function areaOf(viewport: Viewport): Area {
  const i = viewport.inset;
  const left = i ? i.left : 0;
  const top = i ? i.top : 0;
  const right = i ? i.right : 0;
  const bottom = i ? i.bottom : 0;
  const width = Math.max(1, viewport.width - left - right);
  const height = Math.max(1, viewport.height - top - bottom);
  if (viewport.square) {
    const side = Math.min(width, height);
    return {
      left: left + (width - side) / 2,
      top: top + (height - side) / 2,
      width: side,
      height: side,
    };
  }
  return { left, top, width, height };
}

/** Canvas pixel of the board's top-left corner. */
export function boardOrigin(
  cam: Camera,
  viewport: Viewport,
  size: number,
): Vec {
  const a = areaOf(viewport);
  const boardSize = size * cellSize(cam, viewport, size);
  return {
    x: a.left + a.width / 2 + cam.panX - boardSize / 2,
    y: a.top + a.height / 2 + cam.panY - boardSize / 2,
  };
}

export function fit(viewport?: Viewport, size?: number): Camera {
  void viewport;
  void size;
  return { zoom: 1, panX: 0, panY: 0 };
}

export function cellSize(
  cam: Camera,
  viewport: Viewport,
  size: number,
): number {
  const a = areaOf(viewport);
  const pad = viewport.pad ?? 0;
  const base = Math.min(
    Math.max(1, a.width - 2 * pad) / size,
    Math.max(1, a.height - 2 * pad) / size,
  );
  return base * cam.zoom;
}

export function panBy(
  cam: Camera,
  dx: number,
  dy: number,
  viewport: Viewport,
  size: number,
): Camera {
  const a = areaOf(viewport);
  const cSize = cellSize(cam, viewport, size);
  const boardW = size * cSize;
  const boardH = size * cSize;
  const maxPanX = Math.max(0, (boardW - a.width) / 2);
  const maxPanY = Math.max(0, (boardH - a.height) / 2);
  const panX = Math.max(-maxPanX, Math.min(maxPanX, cam.panX + dx));
  const panY = Math.max(-maxPanY, Math.min(maxPanY, cam.panY + dy));
  return { zoom: cam.zoom, panX, panY };
}

export function zoomAt(
  cam: Camera,
  factor: number,
  focus: Vec,
  viewport: Viewport,
  size: number,
): Camera {
  const nextZoom = Math.max(1, Math.min(8, cam.zoom * factor));
  const cSize = cellSize(cam, viewport, size);
  const nextCellSize = cellSize(
    { zoom: nextZoom, panX: 0, panY: 0 },
    viewport,
    size,
  );

  const a = areaOf(viewport);
  const origin = boardOrigin(cam, viewport, size);
  const cellX = (focus.x - origin.x) / cSize;
  const cellY = (focus.y - origin.y) / cSize;

  const nextBoardW = size * nextCellSize;
  const nextBoardH = size * nextCellSize;
  const rawNextPanX =
    focus.x - cellX * nextCellSize + nextBoardW / 2 - (a.left + a.width / 2);
  const rawNextPanY =
    focus.y - cellY * nextCellSize + nextBoardH / 2 - (a.top + a.height / 2);

  const maxPanX = Math.max(0, (nextBoardW - a.width) / 2);
  const maxPanY = Math.max(0, (nextBoardH - a.height) / 2);
  const panX = Math.max(-maxPanX, Math.min(maxPanX, rawNextPanX));
  const panY = Math.max(-maxPanY, Math.min(maxPanY, rawNextPanY));

  return { zoom: nextZoom, panX, panY };
}

export function toCell(
  cam: Camera,
  point: Vec,
  viewport: Viewport,
  size: number,
): Vec {
  const cSize = cellSize(cam, viewport, size);
  const o = boardOrigin(cam, viewport, size);
  return {
    x: (point.x - o.x) / cSize,
    y: (point.y - o.y) / cSize,
  };
}

export function toScreen(
  cam: Camera,
  cell: Vec,
  viewport: Viewport,
  size: number,
): Vec {
  const cSize = cellSize(cam, viewport, size);
  const o = boardOrigin(cam, viewport, size);
  return {
    x: o.x + cell.x * cSize,
    y: o.y + cell.y * cSize,
  };
}

export function isTap(down: Vec, up: Vec): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= 6;
}
