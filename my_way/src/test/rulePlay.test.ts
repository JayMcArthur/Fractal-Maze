import { expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library/catalog'
import { rulePlayDocument } from '../app/library/rulePlayDocument'
import { validateMaze } from '../core/validate/validateMaze'
import {
  initialPathSession,
  crossPathSession,
  sessionPathRoute,
  pathSessionFinished,
  undoPathSession,
  pathRouteSession,
} from '../core/play/pathSession'
import { availableMoves, runPathInput, stateKey } from '../core/pathMaze/traversal'
import { nearestTracePoint } from '../core/pathMaze/artworkRoutes'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { balancedPathSearch } from '../core/pathMaze/balancedSearch'
import type { PathMazeDefinition } from '../core/model/pathMaze'
import { sourceGateDirection } from '../core/play/sourceWalking'
import { pathDocument } from '../app/library/pathDocument'

const ids = [
  'pda-guide-2',
  'pda-guide-3',
  'pda-guide-4',
  'pda-guide-6',
  'simple-infinite-hop',
  'simple-nested-infinite-hop',
]

it.each(ids)(
  'gives %s real block geometry without changing its model or original document',
  (id) => {
    const original = loadCatalogMaze(id)!,
      before = structuredClone(original)
    const playable = rulePlayDocument(original)!,
      model = playable.definition as PathMazeDefinition,
      art = playable.artwork!
    expect(playable.definition).toBe(original.definition)
    expect(original).toEqual(before)
    expect(art.asset).toBe('')
    expect(art.blockSize).toBeGreaterThan(0)
    expect(new Set(art.frames.map((frame) => frame.id))).toEqual(new Set(model.copies))
    expect(new Set(art.gates?.map((gate) => gate.edge))).toEqual(
      new Set(model.connections.map((edge) => edge.id))
    )
    expect(validateMaze(playable).issues.filter((issue) => issue.severity === 'error')).toEqual([])
    for (const trace of art.traces)
      for (let i = 1; i < trace.points.length; i++)
        expect(
          trace.points[i][0] === trace.points[i - 1][0] ||
            trace.points[i][1] === trace.points[i - 1][1]
        ).toBe(true)
    const initial = initialPathSession(model, art)
    expect(initial.positions[0].point).toBeDefined()
    for (const move of availableMoves(model, model.start!)) {
      const crossed = crossPathSession(initial, model, art, move.edge.id)
      expect(crossed.moves).toHaveLength(1)
      expect(crossed.positions.at(-1)?.point).toBeDefined()
      const position = crossed.positions.at(-1)!
      expect(
        nearestTracePoint(
          art.traces.filter((trace) => trace.path === position.state.path),
          position.point!
        )!.distance
      ).toBeLessThan(1e-6)
      expect(undoPathSession(crossed)).toEqual(initial)
      const replay = buildNativeReplay(
        playable,
        { type: model.type, ...sessionPathRoute(crossed), physical: crossed },
        'human',
        false
      )
      expect(importReplay(JSON.stringify(replay)).nativeRoute).toEqual(replay.nativeRoute)
    }
  }
)

it.each(['pda-guide-2', 'pda-guide-3', 'pda-guide-4', 'pda-guide-6'])(
  'projects the complete %s solution into physical blocks and checks its exact finish',
  (id) => {
    const original = loadCatalogMaze(id)!,
      doc = rulePlayDocument(original)!,
      model = doc.definition as PathMazeDefinition
    const source = model.providedInput && runPathInput(model, model.providedInput)
    const route = source && source.accepted ? source.route : balancedPathSearch(model)
    expect(route).not.toBeNull()
    const session = pathRouteSession(model, doc.artwork!, route!)
    expect(pathSessionFinished(model, doc.artwork, session.positions.at(-1))).toBe(true)
    const recorded = sessionPathRoute(session)
    expect(stateKey(recorded.states.at(-1)!)).toBe(stateKey(model.goal!))
    const replay = buildNativeReplay(
      doc,
      { type: model.type, ...recorded, physical: session },
      'solver',
      true
    )
    expect(importReplay(JSON.stringify(replay)).status).toBe('complete')
  }
)

it('leaves bound sources, unfinished image drafts and non-path models untouched', () => {
  for (const id of [
    'alice-in-wonderland',
    'draft-maze-images-snuke-snuke-3-png',
    'draft-maze-images-martin-windischer-windischer-gif',
    'repeated-atomic-cp3-3',
  ])
    expect(rulePlayDocument(loadCatalogMaze(id)!)).toBeNull()
})

it('uses a checked real grid layout for both recurrences, with exactly their own copy letters', () => {
  for (const id of ['pda-guide-3', 'pda-guide-6']) {
    const doc = rulePlayDocument(loadCatalogMaze(id)!)!
    expect(doc.artwork!.blockSize).toBe(1)
    expect(doc.artwork!.width).toBeLessThan(64)
    const model = doc.definition as PathMazeDefinition
    expect(new Set(doc.artwork!.frames.map((frame) => frame.id))).toEqual(new Set(model.copies))
    if (id === 'pda-guide-6') {
      expect(doc.artwork!.start![1]).toBe(0.5)
      expect(doc.artwork!.goal![1]).toBeGreaterThanOrEqual(doc.artwork!.height - 1.5)
    }
  }
})

it('gives branching guide paths separate physical doors instead of coincident keyboard choices', () => {
  for (const id of ['pda-guide-2', 'pda-guide-4']) {
    const doc = rulePlayDocument(loadCatalogMaze(id)!)!,
      model = doc.definition as PathMazeDefinition,
      art = doc.artwork!
    for (const path of model.paths) {
      const gates = art.gates!.filter(
        (gate) => model.connections.find((edge) => edge.id === gate.edge)!.from === path.id
      )
      expect(new Set(gates.map((gate) => JSON.stringify(gate.from))).size).toBe(gates.length)
      for (const gate of gates) {
        const edge = model.connections.find((edge) => edge.id === gate.edge)!
        expect(sourceGateDirection(art, edge, model)).toBe(edge.operation === 'enter' ? 2 : 8)
      }
    }
  }
})

it('draws an imported one-way connection as a continuous directed corridor with a keyboard crossing', () => {
  const original = loadCatalogMaze('simple-infinite-hop')!.definition as PathMazeDefinition
  const model: PathMazeDefinition = {
    ...original,
    type: 'pathPushdown',
    allowedRule: 'finite',
    copies: [],
    connections: [
      { id: 'one-way', from: '1', to: '2', operation: 'walk', copy: '', input: '', evidence: '' },
    ],
  }
  const doc = rulePlayDocument(pathDocument('directed', 'One-way maze', model))!,
    art = doc.artwork!,
    gate = art.gates![0]
  expect(gate.from).toEqual(gate.to)
  expect(sourceGateDirection(art, model.connections[0], model)).toBe(4)
  const route = balancedPathSearch(model)!
  const session = pathRouteSession(model, art, route)
  expect(pathSessionFinished(model, art, session.positions.at(-1))).toBe(true)
  expect(availableMoves(model, session.positions.at(-1)!.state)).toEqual([])
  const replay = buildNativeReplay(
    doc,
    { type: model.type, ...sessionPathRoute(session), physical: session },
    'solver',
    true
  )
  expect(importReplay(JSON.stringify(replay)).status).toBe('complete')
})

it('records the physical walk to a same-path finish without changing a partial zero-step recording', () => {
  const original = loadCatalogMaze('simple-infinite-hop')!.definition as PathMazeDefinition
  const model: PathMazeDefinition = {
    ...original,
    type: 'pathPushdown',
    allowedRule: 'finite',
    copies: [],
    connections: [],
    goal: original.start,
  }
  const doc = rulePlayDocument(pathDocument('one-path', 'One path', model))!
  const route = { type: model.type, states: [model.start!], edges: [] }
  const complete = buildNativeReplay(doc, route, 'solver', true)
  expect(
    complete.nativeRoute &&
      'physical' in complete.nativeRoute &&
      complete.nativeRoute.physical?.moves
  ).toHaveLength(1)
  expect(importReplay(JSON.stringify(complete)).status).toBe('complete')
  const partial = buildNativeReplay(doc, route, 'solver', false)
  expect(partial.nativeRoute).not.toHaveProperty('physical')
  expect(importReplay(JSON.stringify(partial)).status).toBe('partial')
})
