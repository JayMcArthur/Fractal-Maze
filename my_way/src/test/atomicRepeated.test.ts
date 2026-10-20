import { expect, it } from 'vitest'
import { catalog, loadCatalogMaze } from '../app/library'
import { repeatedImportAdapter, repeatedExportAdapter } from '../core/io/adapters/repeatedAdapter'
import {
  repeatedNeighbors,
  repeatedPosition,
  repeatedStateKey,
} from '../core/model/repeatedDirected'
import type { RepeatedDirectedDefinition } from '../core/model/repeatedDirected'
import { solveRepeated } from '../core/solver/traversal/repeatedSolver'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { validateMaze } from '../core/validate/validateMaze'

it('uses internal terminals and reversible corner ports without crossing the grid boundary', () => {
  const doc = repeatedImportAdapter.import(
    'normal: E0->C0; nx: (none); ny: (none); zero: W0-C0, C0-C1, C1-W1'
  )
  const model = doc.definition as RepeatedDirectedDefinition
  expect(model.start).toEqual({ x: 0, y: 0, terminal: 'W0' })
  expect(repeatedNeighbors(model, model.start)).toEqual([{ x: 0, y: 0, terminal: 'C0' }])
  expect(repeatedNeighbors(model, { x: 0, y: 0, terminal: 'C0' })).toEqual([
    { x: 0, y: 0, terminal: 'W0' },
    { x: 0, y: 0, terminal: 'C1' },
  ])
  expect(solveRepeated(model, 2).path).toEqual([
    model.start,
    { x: 0, y: 0, terminal: 'C0' },
    { x: 0, y: 0, terminal: 'C1' },
    model.goal,
  ])
  expect(repeatedImportAdapter.import(repeatedExportAdapter.export(doc)).definition).toEqual(model)
  expect(validateMaze(doc).issues.filter((issue) => issue.severity === 'error')).toEqual([])
})

it('imports every new upstream construction and legally follows all eight independent solutions', () => {
  const entries = catalog.filter((entry) => entry.id.startsWith('repeated-atomic-'))
  expect(entries).toHaveLength(12)
  let solutions = 0
  for (const entry of entries) {
    const doc = loadCatalogMaze(entry.id)!,
      model = doc.definition as RepeatedDirectedDefinition
    expect(
      validateMaze(doc).issues.filter((issue) => issue.severity === 'error'),
      entry.id
    ).toEqual([])
    if (!model.providedRoute) continue
    solutions++
    const route = model.providedRoute
    expect(route[0]).toEqual(repeatedPosition(model, model.start))
    expect(route.at(-1)).toEqual(repeatedPosition(model, model.goal))
    expect(
      route
        .slice(1)
        .every((state, i) =>
          repeatedNeighbors(model, route[i]).some(
            (next) => repeatedStateKey(next) === repeatedStateKey(state)
          )
        ),
      entry.id
    ).toBe(true)
  }
  expect(solutions).toBe(8)
})

it('matches the upstream shortest route lengths, counting each boundary crossing', () => {
  for (const [id, moves] of [
    ['cp2-3', 59],
    ['md3', 117],
  ] as const) {
    const model = loadCatalogMaze(`repeated-atomic-${id}`)!.definition as RepeatedDirectedDefinition
    const result = solveRepeated(model, 40)
    expect(result.status).toBe('solved')
    expect(result.path).toHaveLength(moves + 1)
  }
})

it('round-trips an atomic replay and rejects an invented internal-terminal jump', () => {
  const doc = loadCatalogMaze('repeated-atomic-cp2-3')!
  const model = doc.definition as RepeatedDirectedDefinition
  const replay = buildNativeReplay(
    doc,
    { type: 'repeatedDirected', states: model.providedRoute! },
    'solver',
    true
  )
  expect(importReplay(JSON.stringify(replay)).nativeRoute).toEqual(replay.nativeRoute)
  if (replay.nativeRoute?.type !== 'repeatedDirected') throw new Error('Wrong replay family')
  replay.nativeRoute.states[1] = { x: 0, y: 0, terminal: 'C0' }
  expect(() => importReplay(JSON.stringify(replay))).toThrow('illegal repeated-maze move')
})

it('uses the atomic origin for the compiled source computation and its halt outlet', () => {
  const doc = loadCatalogMaze('repeated-atomic-cp-n3-godel')!
  const model = doc.definition as RepeatedDirectedDefinition
  expect(model.start).toEqual({ x: 0, y: 0, terminal: 'W0' })
  expect(model.goal).toEqual({ x: 0, y: 0, terminal: 'W1' })
  expect(model.zero).toBeDefined()
  expect(model.nx.length).toBeGreaterThan(0)
  expect(model.ny.length).toBeGreaterThan(0)
  expect(model.providedRoute).toBeUndefined()
  expect(repeatedNeighbors(model, model.start).length).toBeGreaterThan(0)
  expect(doc.metadata.tags).toContain('wip')
})
