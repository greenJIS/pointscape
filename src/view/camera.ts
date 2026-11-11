import type { Vec } from '../core/types';

export interface Camera {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
}

export interface Viewport {
  readonly width: number;
  readonly height: number;
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
  const base = Math.min(viewport.width / size, viewport.height / size);
  return base * cam.zoom;
}

export function panBy(
  cam: Camera,
  dx: number,
  dy: number,
  viewport: Viewport,
  size: number,
): Camera {
  const cSize = cellSize(cam, viewport, size);
  const boardW = size * cSize;
  const boardH = size * cSize;
  const maxPanX = Math.max(0, (boardW - viewport.width) / 2);
  const maxPanY = Math.max(0, (boardH - viewport.height) / 2);
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

  const originX = viewport.width / 2 + cam.panX - (size * cSize) / 2;
  const originY = viewport.height / 2 + cam.panY - (size * cSize) / 2;
  const cellX = (focus.x - originX) / cSize;
  const cellY = (focus.y - originY) / cSize;

  const nextBoardW = size * nextCellSize;
  const nextBoardH = size * nextCellSize;
  const rawNextPanX =
    focus.x - cellX * nextCellSize + nextBoardW / 2 - viewport.width / 2;
  const rawNextPanY =
    focus.y - cellY * nextCellSize + nextBoardH / 2 - viewport.height / 2;

  const maxPanX = Math.max(0, (nextBoardW - viewport.width) / 2);
  const maxPanY = Math.max(0, (nextBoardH - viewport.height) / 2);
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
  const boardW = size * cSize;
  const boardH = size * cSize;
  const originX = viewport.width / 2 + cam.panX - boardW / 2;
  const originY = viewport.height / 2 + cam.panY - boardH / 2;
  return {
    x: (point.x - originX) / cSize,
    y: (point.y - originY) / cSize,
  };
}

export function toScreen(
  cam: Camera,
  cell: Vec,
  viewport: Viewport,
  size: number,
): Vec {
  const cSize = cellSize(cam, viewport, size);
  const boardW = size * cSize;
  const boardH = size * cSize;
  const originX = viewport.width / 2 + cam.panX - boardW / 2;
  const originY = viewport.height / 2 + cam.panY - boardH / 2;
  return {
    x: originX + cell.x * cSize,
    y: originY + cell.y * cSize,
  };
}

export function isTap(down: Vec, up: Vec): boolean {
  return Math.hypot(up.x - down.x, up.y - down.y) <= 6;
}
