import { describe, it, expect } from 'vitest'
import { catalog, loadCatalogMaze } from '../app/library'
import {
  canonicalTerminal,
  repeatedNeighbors,
  repeatedStateKey,
  type RepeatedDirectedDefinition,
} from '../core/model/repeatedDirected'
import {
  portMoves,
  portStateKey,
  type RecursivePortsDefinition,
} from '../core/model/recursivePorts'
import { solvePorts } from '../core/solver/traversal/portSolver'
import { buildNativeReplay, replayStepCount } from '../core/replay/nativeReplay'
import { useReplayStore } from '../app/store/replaySlice'

describe('remaining source mazes', () => {
  for (const name of ['cp6', 'md3', 'md4', 'md5'])
    it(`preserves and legally traverses the original ${name} solution`, () => {
      const def = loadCatalogMaze(`repeated-${name}`)!.definition as RepeatedDirectedDefinition
      const route = def.providedRoute!
      expect(route.length).toBeGreaterThan(1)
      expect(repeatedStateKey(route[0])).toBe(repeatedStateKey(canonicalTerminal(def.start)))
      expect(repeatedStateKey(route.at(-1)!)).toBe(repeatedStateKey(canonicalTerminal(def.goal)))
      for (let i = 1; i < route.length; i++)
        expect(repeatedNeighbors(def, route[i - 1]).map(repeatedStateKey)).toContain(
          repeatedStateKey(route[i])
        )
    })
  for (const id of ['ports-snuke_no3', 'ports-snuke_no4'])
    it(`${id} solves using legal recursive transitions`, () => {
      const doc = loadCatalogMaze(id)!,
        def = doc.definition as RecursivePortsDefinition
      const result = solvePorts(def, 14)
      expect(result.status).toBe('solved')
      expect(portStateKey(result.path.at(-1)!)).toBe(portStateKey(def.goal))
      for (let i = 1; i < result.path.length; i++)
        expect(
          portMoves(def, result.path[i - 1]).map((move) => portStateKey(move.state))
        ).toContain(portStateKey(result.path[i]))
      const replay = buildNativeReplay(
        doc,
        { type: 'recursivePorts', states: result.path },
        'solver',
        true
      )
      expect(replayStepCount(replay)).toBe(result.path.length - 1)
      useReplayStore.getState().loadReplay(replay)
      useReplayStore.getState().seekTo(result.path.length - 1)
      expect(useReplayStore.getState().currentStep).toBe(result.path.length - 1)
      result.path[0].port = 999
      expect(replay.nativeRoute!.states[0]).toMatchObject({ port: 0 })
    })
  it('reports the state limit on the highly branching Koteitan fixture', () => {
    const def = loadCatalogMaze('ports-koteitan')!.definition as RecursivePortsDefinition
    expect(solvePorts(def, 14).status).toBe('limit')
  })
  it('traverses the known Koteitan route to its exact goal', () => {
    const def = loadCatalogMaze('ports-koteitan')!.definition as RecursivePortsDefinition,
      route = def.providedRoute!
    for (let i = 1; i < route.length; i++)
      expect(portMoves(def, route[i - 1]).map((move) => portStateKey(move.state))).toContain(
        portStateKey(route[i])
      )
    expect(portStateKey(route.at(-1)!)).toBe(portStateKey(def.goal))
  })
  it('keeps every catalog ID unique', () =>
    expect(new Set(catalog.map((entry) => entry.id)).size).toBe(catalog.length))
  it('does not invent an upward transition from the surface', () => {
    const def = loadCatalogMaze('ports-snuke_no4')!.definition as RecursivePortsDefinition
    expect(portMoves(def, def.start).every((move) => move.state.blocks.length >= 1)).toBe(true)
  })
})

it('gives the source block patterns permitted bottom entries and top exits', () => {
  for (const id of ['koteitan-block-3', 'koteitan-block-5']) {
    const model = loadCatalogMaze(id)!.definition
    if (model.type !== 'blockRecursive') throw new Error('Expected block pattern')
    expect(model.start![1]).toBe(model.unit - 1)
    expect(model.goal![1]).toBe(0)
    expect(model.pattern[model.start![1] * model.unit + model.start![0]]).toBe(0)
    expect(model.pattern[model.goal![1] * model.unit + model.goal![0]]).toBe(0)
  }
})
