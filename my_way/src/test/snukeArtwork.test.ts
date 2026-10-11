import { expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library/catalog'
import { pathDocs } from '../app/library/pathCatalog'
import type { PathMazeDefinition, PathState } from '../core/model/pathMaze'
import { availableMoves, searchPaths, stateKey } from '../core/pathMaze/traversal'
import { portMoves } from '../core/model/recursivePorts'

it('source arrow conversions preserve every exact C++ move through three copy levels', () => {
  for (const number of [3, 4]) {
    const source = pathDocs.find(
      (doc) => doc.metadata.id === `draft-maze-images-snuke-snuke-${number}-png`
    )!
    const model = source.definition as PathMazeDefinition
    const native = loadCatalogMaze(`ports-snuke_no${number}`)!.definition
    if (native.type !== 'recursivePorts') throw new Error('Expected source port rules')
    const queue: PathState[] = [model.start!],
      seen = new Set<string>()
    for (const state of queue) {
      if (seen.has(stateKey(state))) continue
      seen.add(stateKey(state))
      const expected = portMoves(
        native,
        {
          blocks: [0, ...state.address.map((copy) => native.blocks.indexOf(copy))],
          port: Number(state.path),
        },
        3
      ).map(({ state }) =>
        stateKey({
          path: String(state.port),
          address: state.blocks.slice(1).map((block) => native.blocks[block]),
        })
      )
      const moves = availableMoves(model, state).filter(({ next }) => next.address.length <= 3)
      expect(
        new Set(moves.map(({ next }) => stateKey(next))),
        `${number}: ${stateKey(state)}`
      ).toEqual(new Set(expected))
      queue.push(...moves.map(({ next }) => next))
    }
    expect(searchPaths(model, 10).route, `Snuke ${number} finite solution`).not.toBeNull()
  }
})

it('Snuke 2 reaches G through its directed sibling-copy wire without jumping at crossings', () => {
  const doc = pathDocs.find((doc) => doc.metadata.id === 'draft-maze-images-snuke-snuke-2-jpg')!
  const model = doc.definition as PathMazeDefinition
  const route = searchPaths(model, 8).route!
  expect(route.edges).toEqual([
    'arrow-1',
    'arrow-4',
    'arrow-3',
    'arrow-2',
    'arrow-12-leave',
    'arrow-12-enter',
    'arrow-9',
    'arrow-9',
  ])
  expect(route.states.at(-1)).toEqual(model.goal)
  expect(model.allowedRule).toBe('finite')
  expect(
    availableMoves(model, { path: '0', address: [] }).some(({ next }) => next.path === '2')
  ).toBe(false)
})
