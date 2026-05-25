export type Direction = 'west' | 'east' | 'north' | 'south';
export type Cell = readonly [number, number];
export type BlockPosition = readonly Cell[];

export interface FractalBlockPattern {
  readonly cells: ReadonlyArray<ReadonlyArray<number>>;
  readonly unit: number;
}

export function patternFromRows(rows: ReadonlyArray<ReadonlyArray<number>>): FractalBlockPattern {
  if (rows.length === 0) throw new Error('pattern must have at least one row');
  const unit = rows.length;
  if (rows.some((row) => row.length !== unit)) {
    throw new Error('fractal block pattern must be square');
  }
  for (const row of rows) {
    for (const value of row) {
      if (value !== 0 && value !== 1) {
        throw new Error('fractal block pattern cells must be 0 or 1');
      }
    }
  }
  return {
    cells: rows.map((row) => [...row]),
    unit,
  };
}

export function isBlack(pattern: FractalBlockPattern, cell: Cell): boolean {
  return pattern.cells[cell[1]][cell[0]] === 1;
}

export function isWhite(pattern: FractalBlockPattern, cell: Cell): boolean {
  return !isBlack(pattern, cell);
}

function boundaryEntries(pattern: FractalBlockPattern, direction: Direction): Cell[] {
  const unit = pattern.unit;
  switch (direction) {
    case 'west':
      return Array.from({ length: unit }, (_, y) => [unit - 1, y] as const);
    case 'east':
      return Array.from({ length: unit }, (_, y) => [0, y] as const);
    case 'north':
      return Array.from({ length: unit }, (_, x) => [x, unit - 1] as const);
    case 'south':
      return Array.from({ length: unit }, (_, x) => [x, 0] as const);
  }
}

export interface FractalBlockMaze {
  readonly pattern: FractalBlockPattern;
  readonly entryDirection: Direction;
  readonly goalDirection: Direction;
}

export function createFractalBlockMaze(
  pattern: FractalBlockPattern,
  entryDirection: Direction = 'north',
  goalDirection: Direction = 'north',
): FractalBlockMaze {
  return { pattern, entryDirection, goalDirection };
}

function enter(
  maze: FractalBlockMaze,
  prefix: BlockPosition,
  direction: Direction,
  depthLimit: number,
): BlockPosition[] {
  if (prefix.length >= depthLimit) return [];
  const results: BlockPosition[] = [];
  for (const cell of boundaryEntries(maze.pattern, direction)) {
    const candidate: BlockPosition = [...prefix, cell];
    if (isWhite(maze.pattern, cell)) {
      results.push(candidate);
    } else {
      results.push(...enter(maze, candidate, direction, depthLimit));
    }
  }
  return results;
}

export function startPositions(maze: FractalBlockMaze, depthLimit: number): BlockPosition[] {
  return enter(maze, [], maze.entryDirection, depthLimit);
}

function moveWithCarry(
  maze: FractalBlockMaze,
  position: BlockPosition,
  direction: Direction,
): { moved: BlockPosition; over: boolean } {
  if (position.length === 0) {
    return { moved: position, over: true };
  }
  const cells = position.map((cell) => [cell[0], cell[1]] as [number, number]);
  const offsets: Record<Direction, [0 | 1, -1 | 1]> = {
    west: [0, -1],
    east: [0, 1],
    north: [1, -1],
    south: [1, 1],
  };
  const [dim, amount] = offsets[direction];
  const unit = maze.pattern.unit;
  let over = true;
  for (let depth = cells.length - 1; depth >= 0; depth -= 1) {
    cells[depth][dim] += amount;
    if (cells[depth][dim] < 0 || cells[depth][dim] >= unit) {
      cells[depth][dim] = ((cells[depth][dim] % unit) + unit) % unit;
    } else {
      over = false;
      break;
    }
  }
  return { moved: cells.map((pair) => [pair[0], pair[1]] as const), over };
}

function normalizeOrEnter(
  maze: FractalBlockMaze,
  position: BlockPosition,
  direction: Direction,
  depthLimit: number,
): BlockPosition[] {
  for (let index = 0; index < position.length; index += 1) {
    if (isWhite(maze.pattern, position[index])) {
      return [position.slice(0, index + 1)];
    }
  }
  return enter(maze, position, direction, depthLimit);
}

export function neighbors(
  maze: FractalBlockMaze,
  position: BlockPosition,
  depthLimit: number,
): { direction: Direction; positions: BlockPosition[] }[] {
  const result: { direction: Direction; positions: BlockPosition[] }[] = [];
  for (const direction of ['west', 'east', 'north', 'south'] as Direction[]) {
    const { moved, over } = moveWithCarry(maze, position, direction);
    if (over) {
      result.push({ direction, positions: [] });
      continue;
    }
    const expanded = normalizeOrEnter(maze, moved, direction, depthLimit);
    result.push({ direction, positions: expanded });
  }
  return result;
}

export function exitsGoal(
  maze: FractalBlockMaze,
  position: BlockPosition,
  direction: Direction = maze.goalDirection,
): boolean {
  if (position.length === 0) return false;
  return moveWithCarry(maze, position, direction).over;
}

export function positionKey(position: BlockPosition): string {
  return position.map(([x, y]) => `${x},${y}`).join('|');
}
