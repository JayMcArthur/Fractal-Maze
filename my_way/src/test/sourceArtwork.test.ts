import { describe, expect, it } from 'vitest'
import { exportPathPDA } from '../core/pathMaze/exportPDA'
import { fmazeExportAdapter, fmazeImportAdapter } from '../core/io/adapters/fmazeAdapter'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { pathDocs } from '../app/library/pathCatalog'
import type { PathMazeDefinition } from '../core/model/pathMaze'
import { nearestTracePoint, artworkRoute } from '../core/pathMaze/artworkRoutes'
import { runPathInput, searchPaths, reachesGoal, sameState } from '../core/pathMaze/traversal'
import { applyConnection } from '../core/pathMaze/traversal'
import { validateArtwork } from '../core/pathMaze/validateArtwork'

describe('source-bound playable mazes', () => {
  const bound = pathDocs.filter((doc) => doc.artwork?.gates?.length)
  it('binds every transition to both source paths and preserves guide solutions', () => {
    expect(bound.length).toBeGreaterThanOrEqual(7)
    for (const doc of bound) {
      const model = doc.definition as PathMazeDefinition,
        artwork = doc.artwork!
      expect(validateArtwork(artwork, model).filter((issue) => issue.severity === 'error'), doc.metadata.title).toEqual([])
      expect(artwork.gates!.length, doc.metadata.title).toBe(model.connections.length)
      for (const edge of model.connections) {
        const gate = artwork.gates!.find((gate) => gate.edge === edge.id)!
        expect(
          nearestTracePoint(
            artwork.traces.filter((trace) => trace.path === edge.from),
            gate.from
          )!.distance
        ).toBeLessThan(artwork.bounds[2] / 100)
        expect(
          nearestTracePoint(
            artwork.traces.filter((trace) => trace.path === edge.to),
            gate.to
          )!.distance
        ).toBeLessThan(artwork.bounds[2] / 100)
      }
      if (model.providedInput)
        expect(runPathInput(model, model.providedInput).accepted, doc.metadata.title).toBe(true)
    }
  })
  it('follows finite examples on the source drawings with established solutions', () => {
    // Berkly's crossing interpretation is still awaiting the author's review.
    for (const doc of bound.filter((doc) => doc.definition.type === 'pathPushdown' && doc.metadata.id !== 'draft-maze-images-mike-earnest-berkly-jpg')) {
      const model = doc.definition as PathMazeDefinition,
        artwork = doc.artwork!
      const route = (
        model.providedInput
          ? runPathInput(model, model.providedInput).route
          : searchPaths(model, 12, 200000).route
      )!
      expect(route, doc.metadata.title).not.toBeNull()
      let point = artwork.start!
      for (let i = 0; i < route.edges.length; i++) {
        const gate = artwork.gates!.find((gate) => gate.edge === route.edges[i])!
        expect(
          artworkRoute(artwork, route.states[i].path, point, gate.from),
          `${doc.metadata.title}: ${route.edges[i]}`
        ).not.toBeNull()
        if (gate.arrivalFrom)
          expect(
            artworkRoute(artwork, route.states[i + 1].path, gate.arrivalFrom, gate.to),
            `${doc.metadata.title}: arrival ${route.edges[i]}`
          ).not.toBeNull()
        point = gate.to
      }
      const end = route.states.at(-1)!
      expect(reachesGoal(model, end)).toBe(true)
      const finish =
        artwork.finishes?.find((finish) => sameState(finish.state, end))?.point ?? artwork.goal!
      expect(
        artworkRoute(artwork, end.path, point, finish),
        `${doc.metadata.title}: finish`
      ).not.toBeNull()
    }
  })
})

it('Sierpinski point helpers preserve the two-copy crossing and its reverse', () => {
  const doc = pathDocs.find((doc) => doc.metadata.id === 'draft-maze-images-siggy-skeptic-play-2-jpg')!
  const model = doc.definition as PathMazeDefinition
  const moves = ['boundary-2-enter', 'boundary-3-enter', 'boundary-3-exit', 'boundary-2-exit']
  let state = { path: '3', address: [] as string[] }
  const states = [state]
  for (const id of moves) {
    state = applyConnection(state, model.connections.find((edge) => edge.id === id)!)!
    states.push(state)
  }
  expect(states).toEqual([
    { path: '3', address: [] }, { path: '6', address: ['A'] },
    { path: '5', address: ['A', 'B'] }, { path: '6', address: ['A'] },
    { path: '3', address: [] },
  ])
  expect(model.paths.filter((path) => path.helper).map((path) => path.id)).toEqual(['6', '7'])
  expect(runPathInput(model, model.providedInput!).accepted).toBe(true)
})

it('Inner Frame follows the source level rules and preserves its room views on export', () => {
  const doc = pathDocs.find((doc) => doc.metadata.id === 'draft-maze-images-the-inner-frame-pdf')!
  const model = doc.definition as PathMazeDefinition
  const result = runPathInput(model, '421412')
  expect(result.accepted).toBe(true)
  expect(result.route!.states.map((state) => state.address.length)).toEqual([0, 1, 2, 3, 2, 1, 0])
  expect(reachesGoal(model, { path: '2', address: ['A'] })).toBe(false)
  expect(fmazeImportAdapter.import(fmazeExportAdapter.export(doc)).artwork!.views).toEqual(doc.artwork!.views)
  const clipped = structuredClone(doc.artwork!)
  clipped.views![0].bounds = [0, 0, 10, 10]
  expect(validateArtwork(clipped, model).some((issue) => issue.code === 'ARTWORK_VIEW')).toBe(true)
})

it('Alice can escape through every declared surface exit, with its bridge kept separate', () => {
  const doc = pathDocs.find(
    (doc) => doc.metadata.id === 'draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png'
  )!
  const model = doc.definition as PathMazeDefinition
  expect(model.paths).toHaveLength(14)
  expect(doc.artwork!.finishes).toHaveLength(12)
  for (const finish of doc.artwork!.finishes!) {
    expect(reachesGoal(model, finish.state)).toBe(true)
    expect(reachesGoal(model, { ...finish.state, address: ['A'] })).toBe(false)
  }
  expect(fmazeImportAdapter.import(fmazeExportAdapter.export(doc)).definition).toEqual(model)
  expect(exportPathPDA(model).alternateGoals).toEqual(model.alternateGoals)
  const route = runPathInput(model, model.providedInput!)
  expect(route.accepted).toBe(true)
})

it('accepts a replay ending at an alternate surface finish and rejects the same path inside a copy', () => {
  const doc = structuredClone(
    pathDocs.find(
      (doc) => doc.metadata.id === 'draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png'
    )!
  )
  const model = doc.definition as PathMazeDefinition
  const route = runPathInput(model, model.providedInput!).route!
  const end = route.states.at(-1)!
  model.goal = model.alternateGoals!.find((goal) => goal.path !== end.path)!
  model.alternateGoals = [
    end,
    ...model.alternateGoals!.filter((goal) => goal.path !== model.goal!.path),
  ]
  doc.artwork!.goal = doc.artwork!.finishes!.find((finish) =>
    sameState(finish.state, model.goal!)
  )!.point
  const replay = buildNativeReplay(doc, { type: 'pathPushdown', ...route }, 'solver', true)
  expect(importReplay(JSON.stringify(replay)).status).toBe('complete')
  expect(reachesGoal(model, { ...end, address: ['A'] })).toBe(false)
})
