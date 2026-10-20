import type { SquareRecursiveDefinition, DirectionBit } from '../model/squareRecursive'
import type { MazeArtwork, ArtworkTrace } from '../model/pathMaze'
import type { SquarePDA } from './squarePDA'
import { resolveMove } from '../solver/common/movementResolver'

/** Draw the actual legal cell graph of a matched, single-copy corridor template. */
export function squareArtwork(def: SquareRecursiveDefinition, binding: SquarePDA): MazeArtwork {
  const point = (row: number, col: number): [number, number] => [col + 0.5, row + 0.5]
  const traces: ArtworkTrace[] = []
  for (const [path, cells] of binding.cells)
    for (const [row, col] of cells) {
      const from = point(row, col)
      const neighbors = ([4, 2] as DirectionBit[]).flatMap((direction) => {
        const move = resolveMove(def, { row, col, blockStack: ['0'] }, direction, 0)
        return move &&
          (move.action.type === 'move' || move.action.type === 'teleport') &&
          binding.cellPaths.get(`${move.newPos.row},${move.newPos.col}`) === path
          ? [point(move.newPos.row, move.newPos.col)]
          : []
      })
      traces.push({ id: `cell-${row}-${col}`, path, color: def.colors.path, points: [from, from] })
      neighbors.forEach((to, index) =>
        traces.push({
          id: `cell-${row}-${col}-${index}`,
          path,
          color: def.colors.path,
          points: [from, to],
        })
      )
    }
  const gates = binding.moves.map((move) => {
    const edge = binding.model.connections.find((edge) => edge.id === move.edges[0])!
    const next = resolveMove(
      def,
      {
        row: move.row,
        col: move.col,
        blockStack: edge.operation === 'exit' ? ['0', edge.copy] : ['0'],
      },
      move.direction,
      0
    )!
    return {
      edge: edge.id,
      from: point(move.row, move.col),
      to: point(next.newPos.row, next.newPos.col),
    }
  })
  return {
    asset: '',
    blockSize: 1,
    width: def.grid.cols,
    height: def.grid.rows,
    bounds: [0, 0, def.grid.cols, def.grid.rows],
    traces,
    gates,
    frames: def.blocks.map((block) => ({
      id: block.name,
      x: block.col,
      y: block.row,
      width: block.width,
      height: block.height,
    })),
    start: point(def.player.row, def.player.col),
    goal: point(def.trophies[0].row, def.trophies[0].col),
  }
}
