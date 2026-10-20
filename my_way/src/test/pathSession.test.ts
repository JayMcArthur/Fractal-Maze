import { expect, it } from 'vitest'
import type { MazeArtwork, PathMazeDefinition } from '../core/model/pathMaze'
import {
  initialPathSession,
  walkPathSession,
  crossPathSession,
  undoPathSession,
  sessionPathRoute,
  pathSessionFinished,
} from '../core/play/pathSession'
import { walkSource } from '../core/play/sourceWalking'
import { buildNativeReplay, replayStepCount } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { pathDocs } from '../app/library/pathCatalog'
import { artworkRoute, distance } from '../core/pathMaze/artworkRoutes'
import { pathCrossing } from '../core/play/pathSession'

const model: PathMazeDefinition = {
  type: 'pathPushdown',
  paths: ['1', '2', '3'].map((id) => ({ id, label: id, color: '#000', helper: false })),
  copies: ['A'],
  start: { path: '1', address: [] },
  goal: { path: '3', address: [] },
  allowedRule: 'finite',
  claims: [],
  review: 'reviewed',
  notes: [],
  connections: [
    { id: 'enter', from: '1', to: '2', operation: 'enter', copy: 'A', input: '', evidence: 'test' },
    { id: 'exit', from: '2', to: '1', operation: 'exit', copy: 'A', input: '', evidence: 'test' },
  ],
}
const artwork: MazeArtwork = {
  asset: '',
  width: 100,
  height: 100,
  bounds: [0, 0, 100, 100],
  frames: [{ id: 'A', x: 10, y: 30, width: 20, height: 20 }],
  start: [0, 0],
  goal: [100, 40],
  traces: [
    {
      id: 'one',
      path: '1',
      color: '#000',
      points: [
        [0, 0],
        [100, 0],
      ],
    },
    {
      id: 'two',
      path: '2',
      color: '#000',
      points: [
        [0, 20],
        [100, 20],
      ],
    },
    {
      id: 'three',
      path: '3',
      color: '#000',
      points: [
        [0, 40],
        [100, 40],
      ],
    },
  ],
  gates: [
    { edge: 'enter', from: [20, 0], to: [0, 20] },
    { edge: 'exit', from: [0, 20], to: [20, 0] },
  ],
}
const maze = { ...pathDocs[0], definition: model, artwork }

it('cannot cross to another Snuke gate after walking down a one-way branch', () => {
  const doc = pathDocs.find(doc => doc.metadata.id === 'draft-maze-images-snuke-snuke-2-jpg')!
  if (doc.definition.type !== 'pathPushdown') throw new Error('Expected Snuke PDA')
  const art = doc.artwork!, model = doc.definition
  const walk = walkSource(art, model.start!.path, art.start!, 1)!
  const session = walkPathSession(initialPathSession(model, art), walk)
  expect(session.positions.at(-1)!.point).toEqual([450, 150])
  expect(pathCrossing(model, art, session.positions.at(-1)!, 'arrow-1')).toBeNull()
  expect(pathCrossing(model, art, session.positions.at(-1)!, 'arrow-0')).not.toBeNull()
})

it('undo and restart retain the actual physical position before any gate crossing', () => {
  const start = initialPathSession(model, artwork)
  const walked = walkPathSession(start, [
    [0, 0],
    [10, 0],
  ])
  expect(walked.positions.at(-1)?.point).toEqual([10, 0])
  expect(undoPathSession(walked)).toEqual(start)
  expect(initialPathSession(model, artwork)).toEqual(start)
})

it('preserves a returned PDA path at a different point and trims a true physical return', () => {
  const start = initialPathSession(model, artwork)
  const entered = crossPathSession(start, model, artwork, 'enter')
  const returned = crossPathSession(entered, model, artwork, 'exit')
  expect(returned.positions.at(-1)).toEqual({ state: model.start, point: [20, 0] })
  expect(returned.moves).toHaveLength(2)
  expect(
    walkPathSession(returned, [
      [20, 0],
      [0, 0],
    ])
  ).toEqual(start)
  expect(undoPathSession(returned)).toEqual(entered)
})

it('round-trips walks and a copy excursion without trimming by PDA state alone', () => {
  let physical = walkPathSession(initialPathSession(model, artwork), [
    [0, 0],
    [10, 0],
  ])
  physical = crossPathSession(physical, model, artwork, 'enter')
  physical = crossPathSession(physical, model, artwork, 'exit')
  const replay = buildNativeReplay(
    maze,
    { type: model.type, ...sessionPathRoute(physical), physical },
    'human',
    false
  )
  expect(replayStepCount(replay)).toBe(3)
  const restored = importReplay(JSON.stringify(replay))
  expect(restored.nativeRoute).toEqual(replay.nativeRoute)
  expect(restored.metrics.totalMoves).toBe(3)
})

it('rejects off-path and reverse one-way physical recordings', () => {
  const directed = {
    ...artwork,
    traces: artwork.traces.map((trace) => ({ ...trace, directed: true })),
  }
  const physical = walkPathSession(initialPathSession(model, directed), [
    [0, 0],
    [20, 0],
  ])
  const replay = buildNativeReplay(
    { ...maze, artwork: directed },
    { type: model.type, ...sessionPathRoute(physical), physical },
    'human',
    false
  )
  if (replay.nativeRoute?.type !== 'pathPushdown' || !replay.nativeRoute.physical)
    throw new Error('missing physical replay')
  replay.nativeRoute.physical.moves.push({
    kind: 'walk',
    points: [
      [20, 0],
      [10, 0],
    ],
  })
  replay.nativeRoute.physical.positions.push({ state: model.start!, point: [10, 0] })
  expect(() => importReplay(JSON.stringify(replay))).toThrow('directed maze path')
  replay.nativeRoute.physical.moves[1] = {
    kind: 'walk',
    points: [
      [20, 0],
      [20, 50],
    ],
  }
  replay.nativeRoute.physical.positions[2].point = [20, 50]
  expect(() => importReplay(JSON.stringify(replay))).toThrow('directed maze path')
})

it('a finish in the starting PDA component still requires reaching the drawn finish', () => {
  const samePathGoal = { ...model, goal: model.start }
  const art = { ...artwork, goal: [100, 0] as [number, number] }
  const start = initialPathSession(samePathGoal, art)
  expect(pathSessionFinished(samePathGoal, art, start.positions[0])).toBe(false)
  const finished = walkPathSession(start, [
    [0, 0],
    [100, 0],
  ])
  expect(pathSessionFinished(samePathGoal, art, finished.positions.at(-1))).toBe(true)
  const replay = buildNativeReplay(
    { ...maze, definition: samePathGoal, artwork: art },
    { type: model.type, ...sessionPathRoute(finished), physical: finished },
    'human',
    true
  )
  expect(importReplay(JSON.stringify(replay)).status).toBe('complete')
})

it('block directions move exactly one cell and stop before a gate', () => {
  const blocks = { ...artwork, blockSize: 10 }
  expect(walkSource(blocks, '1', [0, 0], 4)).toEqual([
    [0, 0],
    [10, 0],
  ])
  expect(walkSource(blocks, '1', [10, 0], 4, [[15, 0]])?.at(-1)).toEqual([15, 0])
  expect(walkSource(blocks, '1', [100, 0], 4)).toBeNull()
})

it('a route ending at a stroke junction does not take an extra trip along the other stroke', () => {
  const junction = {
    ...artwork,
    blockSize: 10,
    traces: [
      {
        id: 'horizontal',
        path: '1',
        color: '#000',
        points: [
          [90, 100],
          [550, 100],
        ] as [number, number][],
      },
      {
        id: 'vertical',
        path: '1',
        color: '#000',
        points: [
          [120, 100],
          [120, 90],
        ] as [number, number][],
      },
    ],
  }
  const route = artworkRoute(junction, '1', [120, 90], [120, 100])!
  expect(route.slice(1).reduce((sum, point, i) => sum + distance(route[i], point), 0)).toBe(10)
})

it('touching block corridors on one PDA path form a junction at an interior crossing', () => {
  const blocks = {
    ...artwork,
    blockSize: 10,
    traces: [
      {
        id: 'vertical',
        path: '1',
        color: '#000',
        points: [
          [10, 0],
          [10, 20],
        ] as [number, number][],
      },
      {
        id: 'horizontal',
        path: '1',
        color: '#000',
        points: [
          [0, 10],
          [20, 10],
        ] as [number, number][],
      },
      {
        id: 'return',
        path: '1',
        color: '#000',
        points: [
          [20, 10],
          [20, 20],
          [10, 20],
        ] as [number, number][],
      },
    ],
  }
  const route = artworkRoute(blocks, '1', [0, 10], [10, 10])!
  expect(route.slice(1).reduce((sum, point, i) => sum + distance(route[i], point), 0)).toBe(10)
  expect(walkSource(blocks, '1', [10, 10], 4)?.at(-1)).toEqual([20, 10])
  expect(walkSource(blocks, '1', [10, 10], 8)?.at(-1)).toEqual([10, 0])
  const folded = {
    ...blocks,
    traces: [
      {
        id: 'folded',
        path: '1',
        color: '#000',
        points: [
          [30, 10],
          [20, 10],
          [20, 20],
          [20, 10],
          [0, 10],
        ] as [number, number][],
      },
    ],
  }
  const direct = artworkRoute(folded, '1', [0, 10], [20, 10])!
  expect(direct.slice(1).reduce((sum, point, i) => sum + distance(direct[i], point), 0)).toBe(20)
})
