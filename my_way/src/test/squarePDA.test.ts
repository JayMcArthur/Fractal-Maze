import { expect, it } from 'vitest'
import { catalog, loadCatalogMaze } from '../app/library/catalog'
import { squarePlayPDA } from '../app/library/playPDA'
import { validateSquareReplay } from '../core/replay/nativeRouteValidation'
import { pathDocs } from '../app/library/pathCatalog'
import {
  compileSquarePDA,
  alignAlicePDA,
  advanceSquarePDA,
  squareActionsFromPDA,
} from '../core/play/squarePDA'
import { balancedPathSearch } from '../core/pathMaze/balancedSearch'
import { resolveMove } from '../core/solver/common/movementResolver'
import generated from '../data/mazes/catalog-solutions.json'
import type { PlayerAction } from '../core/model/playerState'

it.each(catalog.filter((entry) => entry.representationType === 'squareRecursive'))(
  '$title corridor steps agree with the compiled PDA',
  (entry) => {
    const def = loadCatalogMaze(entry.id)!.definition
    if (def.type !== 'squareRecursive') throw new Error('Expected corridor maze')
    const binding = squarePlayPDA(loadCatalogMaze(entry.id)!)
    const solution = generated.find((solution) => solution.mazeId === entry.id)!
    for (const action of (solution?.actions ?? []) as PlayerAction[])
      expect(() => advanceSquarePDA(binding, action)).not.toThrow()
    const route = balancedPathSearch(binding.model)
    if (!route) {
      expect(entry.id).toBe('block-maze')
      return
    }
    expect(route).not.toBeNull()
    const actions = squareActionsFromPDA(def, binding, route!)
    let won = false
    for (const action of actions) {
      const move = resolveMove(def, action.from, action.direction!, Date.now())!
      expect(move.newPos).toEqual(action.to)
      won = move.isWin
    }
    expect(won).toBe(true)
    expect(() => validateSquareReplay(def, actions, true)).not.toThrow()
  }
)
it('Alice source and corridor views have the same numbered ports and PDA states', () => {
  const def = loadCatalogMaze('alice-in-wonderland')!.definition
  if (def.type !== 'squareRecursive') throw new Error('Expected Alice corridor maze')
  const source = pathDocs.find(
    (doc) => doc.metadata.id === 'draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png'
  )!.definition
  if (source.type !== 'pathPushdown') throw new Error('Expected source paths')
  const compiled = compileSquarePDA(def)
  const binding = alignAlicePDA(def, compiled, source)
  expect(compiled.cells.size).toBe(14)
  expect(binding?.model).toBe(source)
})

it('edited endpoints or stack rules cannot alias the bundled Alice PDA', () => {
  const doc = loadCatalogMaze('alice-in-wonderland')!
  if (doc.definition.type !== 'squareRecursive') throw new Error('Expected corridor maze')
  const source = pathDocs.find(
    (doc) => doc.metadata.id === 'draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png'
  )!.definition
  if (source.type !== 'pathPushdown') throw new Error('Expected source paths')
  const compiled = compileSquarePDA(doc.definition)
  expect(
    alignAlicePDA(doc.definition, compiled, { ...source, goal: source.start, alternateGoals: [] })
  ).toBeNull()
  expect(alignAlicePDA(doc.definition, compiled, { ...source, allowedRule: 'infiniteHop' })).toBeNull()
  const connections = source.connections.map((edge, index) =>
    index ? edge : { ...edge, operation: 'walk' as const }
  )
  expect(alignAlicePDA(doc.definition, compiled, { ...source, connections })).toBeNull()
})

it('a warned-about missing exit does not break an otherwise playable corridor project', () => {
  const doc = loadCatalogMaze('alice-in-wonderland')!
  if (doc.definition.type !== 'squareRecursive') throw new Error('Expected corridor maze')
  const def = {
    ...doc.definition,
    links: [...doc.definition.links, { row: 1, col: 1, blockPath: ['A'], exitName: 'missing' }],
  }
  const binding = compileSquarePDA(def)
  const route = balancedPathSearch(binding.model)!
  const actions = squareActionsFromPDA(def, binding, route)
  expect(() => validateSquareReplay(def, actions, true)).not.toThrow()
})
