export interface Vec {
  readonly x: number;
  readonly y: number;
}

/** One arrow: cells run tail to head, `dir` is where the head points. */
export interface Arrow {
  readonly id: number;
  readonly cells: readonly Vec[];
  readonly dir: Vec;
}

export interface Level {
  readonly size: number;
  readonly mask: readonly boolean[];
  readonly arrows: readonly Arrow[];
}
