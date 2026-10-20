import { expect, it } from 'vitest'
import type { MazeArtwork, PathMazeDefinition, ProofClaim } from '../core/model/pathMaze'
import { connectionsFromPairs } from '../core/pathMaze/traversal'
import { checkedClaims, declaredConnections } from '../core/pathMaze/proofs'
import {
  availableProofMoves,
  proofCrossing,
  type CheckedProofStep,
} from '../core/play/proofMovement'
import {
  crossProofSession,
  initialPathSession,
  sessionPathRoute,
  undoPathSession,
  walkPathSession,
  pathSessionFinished,
} from '../core/play/pathSession'
import { createBlockArtwork } from '../core/play/blockArtwork'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { pathDocs } from '../app/library/pathCatalog'
import { proofExamples } from '../app/library/proofExamples'
import solutions from '../data/mazes/catalog-solutions.json'

const hop: ProofClaim = {
  id: 'hop',
  rule: 'infiniteHop',
  from: { path: '1', address: [] },
  to: { path: '2', address: [] },
  scope: [],
  period: ['A'],
  first: [{ kind: 'edge', reference: 'edge-0-in', reverse: false }],
  second: [{ kind: 'edge', reference: 'edge-1-in', reverse: false }],
}
const model: PathMazeDefinition = {
  ...(proofExamples()[0].definition as PathMazeDefinition),
  claims: [hop],
}
const source: MazeArtwork = {
  asset: '',
  bounds: [0, 0, 100, 100],
  width: 100,
  height: 100,
  start: [0, 0],
  goal: [100, 40],
  frames: [{ id: 'A', x: 20, y: 0, width: 20, height: 40 }],
  traces: [0, 40].map((y, index) => ({
    id: `wire-${index}`,
    path: String(index + 1),
    color: '#000',
    points: [
      [0, y],
      [100, y],
    ],
  })),
  gates: [0, 40].flatMap((y, index) => [
    { edge: `edge-${index}-in`, from: [20, y] as [number, number], to: [0, y] as [number, number] },
    {
      edge: `edge-${index}-out`,
      from: [0, y] as [number, number],
      to: [20, y] as [number, number],
    },
  ]),
}
const step: CheckedProofStep = { kind: 'lemma', reference: 'hop', reverse: false }

it('uses a checked connection with a visible finish, physical undo and a validated immutable replay', () => {
  const initial = initialPathSession(model, source)
  const walked = walkPathSession(initial, [
    [0, 0],
    [10, 0],
  ])
  const session = crossProofSession(walked, model, source, step)
  expect(session.positions.at(-1)).toEqual({ state: model.goal, point: source.goal })
  expect(pathSessionFinished(model, source, session.positions.at(-1))).toBe(true)
  expect(undoPathSession(session)).toEqual(walked)
  const maze = { ...proofExamples()[0], definition: model, artwork: source }
  const replay = buildNativeReplay(
    maze,
    { type: model.type, ...sessionPathRoute(session), physical: session },
    'human',
    true
  )
  const imported = importReplay(JSON.stringify(replay))
  expect(imported.nativeRoute).toEqual(replay.nativeRoute)
  expect(imported.metrics.totalMoves).toBe(2)
  expect(sessionPathRoute(session).proofSteps).toEqual([step])
})

it('rejects stale proofs, invented hypotheses and forged arrival positions', () => {
  const initial = initialPathSession(model, source)
  const stale = {
    ...model,
    connections: model.connections.filter((edge) => edge.id !== 'edge-1-in'),
  }
  expect(availableProofMoves(stale, source, initial.positions[0])).toEqual([])
  expect(crossProofSession(initial, stale, source, step)).toBe(initial)
  const session = crossProofSession(initial, model, source, step)
  const maze = { ...proofExamples()[0], definition: model, artwork: source }
  const replay = buildNativeReplay(
    maze,
    { type: model.type, ...sessionPathRoute(session), physical: session },
    'human',
    true
  )
  if (replay.nativeRoute?.type !== 'infiniteRule' || !replay.nativeRoute.physical)
    throw new Error('Missing session')
  replay.nativeRoute.physical.positions[1].point = [50, 70]
  expect(() => importReplay(JSON.stringify(replay))).toThrow('disconnected proof connection')
  const bad = JSON.parse(JSON.stringify(replay))
  bad.nativeRoute.physical.moves[0].step.kind = 'hypothesis'
  expect(() => importReplay(JSON.stringify(bad))).toThrow('exported .fmaze-solution.json')
})

it('applies a nested claim only at its matching address suffix and keeps the surrounding copies', () => {
  const nested = {
    ...model,
    copies: ['A', 'B'],
    claims: [
      { ...hop, from: { path: '1', address: ['A'] }, to: { path: '2', address: ['A', 'A'] } },
    ],
  }
  const unrelated = { state: { path: '1', address: ['B'] }, point: source.start }
  expect(proofCrossing(nested, source, unrelated, step)).toBeNull()
  const matching = { state: { path: '1', address: ['B', 'A'] }, point: source.start }
  expect(proofCrossing(nested, source, matching, step)?.position.state).toEqual({
    path: '2',
    address: ['B', 'A', 'A'],
  })
})

it('a proof cannot jump from a disconnected stroke sharing the logical path ID', () => {
  const disconnected: MazeArtwork = {
    ...source,
    traces: [
      ...source.traces,
      {
        id: 'island',
        path: '1',
        color: '#000',
        points: [
          [0, 80],
          [100, 80],
        ],
      },
    ],
  }
  expect(
    proofCrossing(model, disconnected, { state: model.start!, point: [10, 80] }, step)
  ).toBeNull()
})

it('keeps a returned physical point until walking back to the actual start, then removes proof evidence', () => {
  let session = crossProofSession(initialPathSession(model, source), model, source, step)
  session = crossProofSession(session, model, source, { ...step, reverse: true })
  expect(session.positions.at(-1)).toEqual({ state: model.start, point: [20, 0] })
  expect(session.moves).toHaveLength(2)
  session = walkPathSession(session, [
    [20, 0],
    [0, 0],
  ])
  const trimmed = buildNativeReplay(
    { ...proofExamples()[0], definition: model, artwork: source },
    { type: model.type, ...sessionPathRoute(session), proofSteps: [step], physical: session },
    'human',
    false
  )
  expect(trimmed.nativeRoute).not.toHaveProperty('proofSteps')
  expect(importReplay(JSON.stringify(trimmed)).metrics.totalMoves).toBe(0)
})

it('supports finite checked connections in a finite PDA and disallows their reverse', () => {
  const finite: PathMazeDefinition = {
    ...model,
    type: 'pathPushdown',
    allowedRule: 'finite',
    connections: connectionsFromPairs([['1-2', '/A']], 'Finite example'),
    claims: [
      { ...hop, rule: 'finite', to: { path: '2', address: ['A'] }, first: hop.first, second: [] },
    ],
    goal: { path: '2', address: ['A'] },
  }
  const artwork = {
    ...source,
    gates: [
      { edge: 'edge-0-in', from: [20, 0] as [number, number], to: [0, 40] as [number, number] },
      { edge: 'edge-0-out', from: [0, 40] as [number, number], to: [20, 0] as [number, number] },
    ],
  }
  const session = crossProofSession(initialPathSession(finite, artwork), finite, artwork, step)
  expect(session.moves).toHaveLength(1)
  expect(crossProofSession(session, finite, artwork, { ...step, reverse: true })).toBe(session)
  const replay = buildNativeReplay(
    { ...proofExamples()[0], definition: finite, representationType: finite.type, artwork },
    { type: finite.type, ...sessionPathRoute(session), physical: session },
    'human',
    true
  )
  expect(importReplay(JSON.stringify(replay)).status).toBe('complete')
})

it('every bundled bound proof and joint connection has legal physical endpoints in both layouts', () => {
  let connections = 0
  for (const solution of solutions.filter((solution) => solution.claims)) {
    const doc = pathDocs.find((doc) => doc.metadata.id === solution.mazeId)
    if (!doc?.artwork?.traces.length) continue
    const def = { ...doc.definition, claims: solution.claims } as PathMazeDefinition
    expect(checkedClaims(def).length, solution.mazeId).toBe(solution.claims!.length)
    for (const claim of checkedClaims(def))
      for (const pair of declaredConnections(claim))
        for (const artwork of [doc.artwork, createBlockArtwork(doc.artwork, def)]) {
          const point = artwork.traces.find((trace) => trace.path === pair.from.path)!.points[0]
          const crossed = proofCrossing(
            def,
            artwork,
            { state: pair.from, point },
            { kind: 'lemma', reference: pair.id, reverse: false }
          )
          expect(
            crossed,
            `${solution.mazeId}:${pair.id}:${artwork.blockSize ?? 'source'}`
          ).not.toBeNull()
          expect(crossed?.position.state).toEqual(pair.to)
          connections++
        }
  }
  expect(connections).toBe(16)
})

it('nested and reversed composite proofs derive their boundaries from the original wires', () => {
  const fixture = solutions.find((solution) => solution.mazeId === 'simple-nested-infinite-hop')!
  const nested = {
    ...(proofExamples()[1].definition as PathMazeDefinition),
    claims: fixture.claims as ProofClaim[],
  }
  const artwork: MazeArtwork = {
    ...source,
    goal: [100, 80],
    frames: [...source.frames, { id: 'B', x: 60, y: 0, width: 20, height: 80 }],
    traces: [
      ...source.traces,
      {
        id: 'third',
        path: '3',
        color: '#000',
        points: [
          [0, 80],
          [100, 80],
        ],
      },
    ],
    gates: [
      ...source.gates!,
      { edge: 'edge-2-in', from: [60, 40], to: [40, 0] },
      { edge: 'edge-2-out', from: [40, 0], to: [60, 40] },
      { edge: 'edge-3-in', from: [60, 80], to: [40, 80] },
      { edge: 'edge-3-out', from: [40, 80], to: [60, 80] },
    ],
  }
  const forward: CheckedProofStep = { kind: 'lemma', reference: 'infinite-1-3', reverse: false }
  const crossed = proofCrossing(
    nested,
    artwork,
    { state: nested.start!, point: artwork.start },
    forward
  )!
  expect(crossed.motion?.departure.at(-1)).toEqual([20, 0])
  expect(crossed.motion?.entry).toEqual([60, 80])
  expect(crossed.position).toEqual({ state: nested.goal, point: artwork.goal })
  const composite: ProofClaim = {
    ...hop,
    id: 'composite-backwards',
    rule: 'connection',
    from: nested.goal!,
    to: nested.start!,
    first: [{ ...forward, reverse: true }],
    second: [],
  }
  nested.claims = [...nested.claims, composite]
  const reversed = proofCrossing(nested, artwork, crossed.position, {
    kind: 'lemma',
    reference: composite.id,
    reverse: false,
  })!
  expect(reversed.motion?.departure.at(-1)).toEqual([60, 80])
  expect(reversed.position).toEqual({ state: nested.start, point: [20, 0] })
})
