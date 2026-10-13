import {
  createFractalBlockMaze,
  exitsGoal,
  neighbors,
  patternFromRows,
  positionKey,
  startPositions,
  type BlockPosition,
  type Direction,
  type FractalBlockMaze,
} from '@logic-core/coordinate-path';
import type { BrowserPackage } from '@packages/types';

export interface CoordinateHistoryEntry {
  before: BlockPosition;
  after: BlockPosition;
  direction: Direction;
}

export interface CoordinateRuntimeStore {
  readonly kind: 'coordinate_path';
  readonly pkg: BrowserPackage;
  readonly maze: FractalBlockMaze;
  readonly depthLimit: number;
  readonly position: BlockPosition;
  readonly starts: readonly BlockPosition[];
  readonly atGoal: boolean;
  readonly history: readonly CoordinateHistoryEntry[];
  readonly future: readonly CoordinateHistoryEntry[];
  readonly legal: ReadonlyArray<{ direction: Direction; positions: readonly BlockPosition[] }>;
  setDepth(limit: number): void;
  setPosition(position: BlockPosition): void;
  step(direction: Direction): { ok: boolean; error?: string };
  reset(): void;
  undo(): boolean;
  redo(): boolean;
}

export function createCoordinateStore(pkg: BrowserPackage): CoordinateRuntimeStore {
  const patternData = pkg.logic.pattern as { rows: number[][] } | undefined;
  if (!patternData || !Array.isArray(patternData.rows)) {
    throw new Error('coordinate_path package is missing pattern.rows');
  }
  const entryDirection = (pkg.logic.entry as { direction?: Direction } | undefined)?.direction ?? 'north';
  const goalDirection = (pkg.logic.goal as { direction?: Direction } | undefined)?.direction ?? 'north';
  const defaultDepthLimit = Math.max(
    1,
    Number((pkg.logic.solver as { default_depth_limit?: number } | undefined)?.default_depth_limit ?? 5),
  );

  const pattern = patternFromRows(patternData.rows);
  const maze = createFractalBlockMaze(pattern, entryDirection, goalDirection);

  let depthLimit = $state(defaultDepthLimit);
  const starts = $derived(startPositions(maze, depthLimit));
  const initialStarts = startPositions(maze, defaultDepthLimit);
  let position = $state<BlockPosition>(initialStarts.length > 0 ? initialStarts[0] : []);
  let history = $state<CoordinateHistoryEntry[]>([]);
  let future = $state<CoordinateHistoryEntry[]>([]);

  const legal = $derived(neighbors(maze, position, depthLimit));
  const atGoal = $derived(exitsGoal(maze, position));

  function setDepth(limit: number): void {
    depthLimit = Math.max(1, Math.floor(limit));
    const refreshedStarts = startPositions(maze, depthLimit);
    if (refreshedStarts.length === 0) {
      position = [];
    } else if (history.length === 0) {
      position = refreshedStarts[0];
    }
    future = [];
  }

  function setPosition(next: BlockPosition): void {
    position = next;
    history = [];
    future = [];
  }

  function step(direction: Direction): { ok: boolean; error?: string } {
    const moves = legal.find((entry) => entry.direction === direction);
    if (!moves || moves.positions.length === 0) {
      return { ok: false, error: `cannot move ${direction} from current position` };
    }
    const before = position;
    const target = moves.positions[0];
    history = [...history, { before, after: target, direction }];
    future = [];
    position = target;
    return { ok: true };
  }

  function reset(): void {
    const refreshedStarts = startPositions(maze, depthLimit);
    position = refreshedStarts.length > 0 ? refreshedStarts[0] : [];
    history = [];
    future = [];
  }

  function undo(): boolean {
    if (history.length === 0) return false;
    const last = history[history.length - 1];
    history = history.slice(0, -1);
    future = [last, ...future];
    position = last.before;
    return true;
  }

  function redo(): boolean {
    if (future.length === 0) return false;
    const next = future[0];
    future = future.slice(1);
    history = [...history, next];
    position = next.after;
    return true;
  }

  return {
    kind: 'coordinate_path',
    pkg,
    maze,
    get depthLimit() {
      return depthLimit;
    },
    get position() {
      return position;
    },
    get starts() {
      return starts;
    },
    get atGoal() {
      return atGoal;
    },
    get history() {
      return history;
    },
    get future() {
      return future;
    },
    get legal() {
      return legal;
    },
    setDepth,
    setPosition,
    step,
    reset,
    undo,
    redo,
  };
}

export { positionKey };
