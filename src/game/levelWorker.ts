import { buildSafeLevel } from '../core/levels';
import type { Level } from '../core/types';

export interface LevelRequest {
  readonly id: number;
  readonly sizeIndex: number;
  readonly level: number;
}

export interface LevelReply {
  readonly id: number;
  readonly board: Level | null;
}

export function handleLevelRequest(data: LevelRequest): LevelReply {
  const { id, sizeIndex, level } = data;
  try {
    return { id, board: buildSafeLevel(sizeIndex, level) };
  } catch {
    return { id, board: null };
  }
}

/** Builds levels off the main thread, so big boards do not freeze the page. */
if (typeof self !== 'undefined' && 'onmessage' in self) {
  self.onmessage = (e: MessageEvent<LevelRequest>) => {
    self.postMessage(handleLevelRequest(e.data));
  };
}
