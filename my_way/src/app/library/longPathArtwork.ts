import raw from '../../data/mazes/6_-_Jay_McArthur_-_A_Long_Path_v8.maze?raw'
import { orelMazeImportAdapter } from '../../core/io/adapters/orelMazeAdapter'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import type { SquareRecursiveDefinition } from '../../core/model/squareRecursive'
import { compileSquarePDA } from '../../core/play/squarePDA'
import { alignSquareModel } from '../../core/play/matchPDA'
import { squareArtwork } from '../../core/play/squareArtwork'

function chain(model: PathMazeDefinition, count: number) {
  if (!model.start) return null
  const paths = [model.start.path],
    copies: string[] = []
  for (let index = 0; index < count; index++) {
    const self = model.connections.filter(
      (edge) => edge.operation === 'enter' && edge.from === paths[index] && edge.to === paths[index]
    )
    if (self.length !== 1) return null
    const next = model.connections.filter(
      (edge) =>
        edge.operation === 'enter' &&
        edge.copy === self[0].copy &&
        edge.to === model.start!.path &&
        edge.from !== model.start!.path
    )
    if (next.length !== 1 || paths.includes(next[0].from)) return null
    paths.push(next[0].from)
    copies.push(self[0].copy)
  }
  return { paths, copies }
}

/** A checked recurrence can reuse the v8 cell layout with explicit copy relabeling. */
export function longPathArtwork(model: PathMazeDefinition) {
  const count = model.copies.length
  if (
    count < 2 ||
    count > 8 ||
    model.paths.length !== count + 1 ||
    model.connections.length !== count * 4
  )
    return null
  const source = chain(model, count)
  if (!source || model.goal?.path !== source.paths.at(-1)) return null
  const original = orelMazeImportAdapter.import(raw).definition as SquareRecursiveDefinition
  const compiled = compileSquarePDA(original),
    native = chain(compiled.model, count)
  if (!native) return null
  const selected = new Set(native.paths),
    aliases = new Map(native.copies.map((copy, index) => [copy, source.copies[index]]))
  const retained = original.links.filter((link) =>
    link.blockPath.every((copy) => aliases.has(copy))
  )
  const links = retained.map((link) => ({
    ...link,
    blockPath: link.blockPath.map((copy) => aliases.get(copy)!),
  }))
  const cells = original.grid.cells.map((cell, index) =>
    selected.has(
      compiled.cellPaths.get(
        `${Math.floor(index / original.grid.cols)},${index % original.grid.cols}`
      )!
    )
      ? cell
      : 0
  )
  // A removed chip becomes a wall, rather than an accidental one-way step into its empty tile.
  for (const link of original.links.filter((link) => !retained.includes(link))) {
    const exit = original.exits.find((exit) => exit.name === link.exitName)!
    const direction = { 8: 2, 4: 1, 2: 8, 1: 4 }[exit.direction]
    cells[link.row * original.grid.cols + link.col] &= ~direction
  }
  let player = original.player
  if (count === 6) {
    const entry = [...compiled.cells.get(native.paths[0])!]
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .find(([row, col]) =>
        Array.from({ length: row }, (_, r) => r).every((r) => {
          const path = compiled.cellPaths.get(`${r},${col}`)
          return (
            (!path || path === native.paths[0]) &&
            !original.blocks.some(
              (block) =>
                r >= block.row &&
                r < block.row + block.height &&
                col >= block.col &&
                col < block.col + block.width
            )
          )
        })
      )
    if (!entry) return null
    const [row, col] = entry
    for (let r = 0; r < row; r++) cells[r * original.grid.cols + col] = r ? 10 : 2
    cells[row * original.grid.cols + col] |= 8
    player = { ...player, row: 0, col }
  }
  const finish = [...compiled.cells.get(native.paths.at(-1)!)!].sort(
    (a, b) => b[0] - a[0] || a[1] - b[1]
  )[0]
  const def: SquareRecursiveDefinition = {
    ...original,
    links,
    player,
    blocks: original.blocks
      .filter((block) => aliases.has(block.name))
      .map((block) => ({ ...block, name: aliases.get(block.name)! })),
    exits: original.exits.filter((exit) => links.some((link) => link.exitName === exit.name)),
    teleporters: original.teleporters.filter((port) =>
      selected.has(compiled.cellPaths.get(`${port.row},${port.col}`)!)
    ),
    trophies: [{ row: finish[0], col: finish[1], color: original.trophies[0].color }],
    grid: { ...original.grid, cells },
  }
  const binding = alignSquareModel(def, compileSquarePDA(def), model)
  if (!binding) return null
  const artwork = squareArtwork(def, binding)
  if (count === 6) {
    const finish: [number, number] = [artwork.goal![0], artwork.height - 0.5]
    artwork.traces.push({
      id: 'finish-hall',
      path: model.goal!.path,
      color: original.colors.path,
      points: [artwork.goal!, finish],
    })
    artwork.goal = finish
  }
  return artwork
}
