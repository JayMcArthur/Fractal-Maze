import type { BlockRecursiveDefinition } from '../model/blockRecursive'
export interface BlockGrid {
  width: number
  depth: number
  cells: Uint8Array
  start: number | null
  goal: number | null
}
export function blockDepthLimit(unit: number): number {
  let depth = 1
  while (depth < 6 && unit ** (depth + 1) <= 2048) depth++
  return depth
}
export function expandBlock(def: BlockRecursiveDefinition, depth: number): BlockGrid {
  if (!Number.isInteger(depth) || depth < 1 || def.unit ** depth > 2048)
    throw new Error('Finite block play supports grids up to 2048 × 2048 cells.')
  let width = def.unit,
    cells = Uint8Array.from(def.pattern)
  for (let level = 1; level < depth; level++) {
    const nextWidth = width * def.unit,
      next = new Uint8Array(nextWidth * nextWidth)
    for (let i = 0; i < cells.length; i++)
      if (cells[i]) {
        const x = (i % width) * def.unit,
          y = Math.floor(i / width) * def.unit
        for (let p = 0; p < def.pattern.length; p++)
          if (def.pattern[p])
            next[(y + Math.floor(p / def.unit)) * nextWidth + x + (p % def.unit)] = 1
      }
    cells = next
    width = nextWidth
  }
  const endpoint = (point: [number, number] | null) =>
    point
      ? Math.floor(((point[1] + 0.5) * width) / def.unit) * width +
        Math.floor(((point[0] + 0.5) * width) / def.unit)
      : null
  return { width, depth, cells, start: endpoint(def.start), goal: endpoint(def.goal) }
}
export function blockNeighbors(grid: BlockGrid, cell: number): number[] {
  const row = Math.floor(cell / grid.width),
    col = cell % grid.width
  return [
    row ? cell - grid.width : -1,
    col + 1 < grid.width ? cell + 1 : -1,
    row + 1 < grid.width ? cell + grid.width : -1,
    col ? cell - 1 : -1,
  ].filter((next) => next >= 0 && !grid.cells[next])
}
export interface BlockSearch {
  status: 'solved' | 'exhausted' | 'missingEndpoints'
  path: number[]
  visited: number
}
export function searchBlock(grid: BlockGrid): BlockSearch {
  if (grid.start === null || grid.goal === null || grid.cells[grid.start] || grid.cells[grid.goal])
    return { status: 'missingEndpoints', path: [], visited: 0 }
  const queue = new Int32Array(grid.cells.length),
    parents = new Int32Array(grid.cells.length).fill(-1)
  let size = 1
  queue[0] = grid.start
  parents[grid.start] = grid.start
  for (let cursor = 0; cursor < size; cursor++) {
    const cell = queue[cursor]
    if (cell === grid.goal) {
      const path = [cell]
      while (path.at(-1) !== grid.start) path.push(parents[path.at(-1)!])
      return { status: 'solved', path: path.reverse(), visited: size }
    }
    for (const next of blockNeighbors(grid, cell))
      if (parents[next] < 0) {
        parents[next] = cell
        queue[size++] = next
      }
  }
  return { status: 'exhausted', path: [], visited: size }
}
export function validateBlockRoute(
  def: BlockRecursiveDefinition,
  depth: number,
  states: number[],
  complete: boolean
): void {
  const grid = expandBlock(def, depth)
  if (grid.start === null || states[0] !== grid.start)
    throw new Error('Block replay must begin at its projected start cell.')
  for (let i = 0; i < states.length; i++)
    if (
      states[i] >= grid.cells.length ||
      grid.cells[states[i]] ||
      (i && !blockNeighbors(grid, states[i - 1]).includes(states[i]))
    )
      throw new Error('Block replay contains a wall crossing or invalid cell.')
  if (complete && states.at(-1) !== grid.goal)
    throw new Error('Complete block replay must reach its projected goal cell.')
}
