import { expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library/catalog'
import { pathMoveSequence } from '../core/play/pathMovement'
import type { PathMazeDefinition } from '../core/model/pathMaze'

it('treats each Sierpinski compound crossing as one move while retaining its exact PDA operations', () => {
  const model = loadCatalogMaze('draft-maze-images-siggy-skeptic-play-2-jpg')!
    .definition as PathMazeDefinition
  const entry = pathMoveSequence(model, model.start!, 'boundary-8-enter')!
  expect(entry.states).toEqual([
    { path: '4', address: [] },
    { path: '7', address: ['B'] },
    { path: '5', address: ['B', 'A'] },
  ])
  expect(entry.edges).toEqual(['boundary-8-enter', 'boundary-9-enter'])
  const exit = pathMoveSequence(model, entry.states.at(-1)!, 'boundary-9-exit')!
  expect(exit.states.at(-1)).toEqual(model.start)
  expect(exit.edges).toEqual(['boundary-9-exit', 'boundary-8-exit'])
  expect(pathMoveSequence(model, model.start!, 'boundary-9-exit')).toBeNull()
})

it('keeps one-way arrows directed and leaves genuine helper choices to the player', () => {
  const source = loadCatalogMaze('draft-maze-images-snuke-snuke-2-jpg')!
    .definition as PathMazeDefinition
  const arrow = source.connections.find((edge) => edge.id === 'arrow-1')!
  const start = { path: arrow.from, address: [] }
  const crossing = pathMoveSequence(source, start, arrow.id)!
  expect(crossing.edges).toEqual([arrow.id])
  expect(pathMoveSequence(source, crossing.states.at(-1)!, arrow.id)).toBeNull()
  const branched = {
    ...source,
    paths: source.paths.map((path) => ({ ...path, helper: path.id === arrow.to })),
  }
  expect(pathMoveSequence(branched, start, arrow.id)!.edges).toEqual([arrow.id])
})
