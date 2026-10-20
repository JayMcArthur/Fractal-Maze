import { expect, it } from 'vitest'
import { repeatedProgressionsIntersect } from '../core/replay/repeatedProgressions'
import { indexRepeatedRoute, validateRepeatedReplay } from '../core/replay/repeatedReplay'
import type { CompactRepeatedRoute } from '../core/replay/repeatedReplay'
import type { RepeatedDirectedDefinition, RepeatedState } from '../core/model/repeatedDirected'
import { repeatedStateKey } from '../core/model/repeatedDirected'
import { buildNativeReplay, nativeRouteStepCount } from '../core/replay/nativeReplay'
import { importReplay } from '../core/replay/importReplay'
import { repeatedImportAdapter } from '../core/io/adapters/repeatedAdapter'

const def: RepeatedDirectedDefinition = {
  type: 'repeatedDirected', terminalsPerSide: 2,
  normal: [{ from: 'W0', to: 'E0' }], nx: [{ from: 'W0', to: 'E0' }], ny: [], zero: [],
  start: { x: 0, y: 1, terminal: 'W0' }, goal: { x: 1000000000, y: 1, terminal: 'W0' },
}
const long: CompactRepeatedRoute = {
  type: 'repeatedDirected', start: def.start,
  runs: [{ count: 1000000000, steps: [[0, 0, 'E0'], [1, 0, 'W0']] }],
}

it('checks and seeks billions of real moves without expanding their states', () => {
  validateRepeatedReplay(def, long, true)
  expect(nativeRouteStepCount(long)).toBe(2000000000)
  const index = indexRepeatedRoute(long)
  expect(index.stateAt(0)).toEqual(def.start)
  expect(index.stateAt(1)).toEqual({ ...def.start, terminal: 'E0' })
  expect(index.stateAt(1999999999)).toEqual({ x: 999999999, y: 1, terminal: 'E0' })
  expect(index.stateAt(index.count)).toEqual(def.goal)
  const maze = repeatedImportAdapter.import('normal: W0->E0; nx: W0->E0; ny: (none); zero: (none)')
  maze.definition = def
  const replay = buildNativeReplay(maze, long, 'solver', true)
  expect(importReplay(JSON.stringify(replay)).nativeRoute).toEqual(long)
})

it('keeps exact incoming terminals at translated pattern and run boundaries', () => {
  const route: CompactRepeatedRoute = { type: 'repeatedDirected', start: def.start,
    runs: [{ count: 3, steps: [[0, 0, 'E0'], [1, 0, 'W0']] },
      { count: 1, steps: [[0, 0, 'C0'], [0, 0, 'W1']] }] }
  const states: RepeatedState[] = [def.start]
  for (const run of route.runs) for (let i = 0; i < run.count; i++)
    for (const [dx, dy, terminal] of run.steps) {
      const previous = states.at(-1)!
      states.push({ x: previous.x + dx, y: previous.y + dy, terminal })
    }
  const index = indexRepeatedRoute(route)
  expect(Array.from({ length: index.count + 1 }, (_, step) => index.stateAt(step))).toEqual(states)
})

it('rejects malformed compact files before playback and checks terminal and coordinate bounds', () => {
  const maze = repeatedImportAdapter.import('normal: W0->E0; nx: W0->E0; ny: (none); zero: (none)')
  maze.definition = def
  const replay = buildNativeReplay(maze, long, 'solver', true)
  for (const run of [
    { count: 0, steps: [[0, 0, 'E0']] },
    { count: 1, steps: [] },
    { count: 1, steps: [[2, 0, 'W0']] },
  ]) {
    expect(() => importReplay(JSON.stringify({ ...replay, nativeRoute: { ...long, runs: [run] } }))).toThrow('Choose an exported')
  }
  expect(() => validateRepeatedReplay(def, { ...long, start: { ...def.start, x: 1 } }, false)).toThrow('start')
  expect(() => validateRepeatedReplay(def, { ...long, runs: [{ count: 1, steps: [[0, 0, 'E2']] }] }, false)).toThrow('unknown terminal')
  expect(() => validateRepeatedReplay(def, { ...long, runs: [{ count: 1, steps: [[-1, 0, 'E0']] }] }, false)).toThrow('unsafe')
})

it('rejects missing boundary rules, a later repetition with an illegal incoming terminal and a wrong finish', () => {
  expect(() => validateRepeatedReplay({ ...def, nx: [] }, long, true)).toThrow('illegal')
  expect(() => validateRepeatedReplay(def, { ...long, runs: [
    { count: 2, steps: [[0, 0, 'E0'], [1, 0, 'W1']] },
  ] }, false)).toThrow('illegal')
  expect(() => validateRepeatedReplay({ ...def, goal: def.start }, long, true)).toThrow('finish')
  expect(() => validateRepeatedReplay(def, { ...long, runs: [
    { count: Number.MAX_SAFE_INTEGER, steps: [[0, 0, 'E0'], [1, 0, 'W0']] },
  ] }, false)).toThrow('unsafe')
})

it('rejects hidden repeated-state detours while old full-state recordings still trim them', () => {
  const reversible: RepeatedDirectedDefinition = { ...def,
    normal: [...def.normal, { from: 'E0', to: 'W0' }],
    nx: [...def.nx, { from: 'E0', to: 'W0' }], goal: { x: 3, y: 1, terminal: 'W0' } }
  const outward = { count: 3, steps: [[0, 0, 'E0'], [1, 0, 'W0']] as CompactRepeatedRoute['runs'][0]['steps'] }
  const returnRun = { count: 3, steps: [[-1, 0, 'E0'], [0, 0, 'W0']] as CompactRepeatedRoute['runs'][0]['steps'] }
  expect(() => validateRepeatedReplay(reversible, { ...long, runs: [outward, returnRun, outward] }, true)).toThrow('detours')
  const maze = repeatedImportAdapter.import('normal: W0-E0; nx: W0-E0; ny: (none); zero: (none)')
  maze.definition = reversible
  const states: RepeatedState[] = [def.start, { ...def.start, terminal: 'E0' }, def.start]
  const index = indexRepeatedRoute({ ...long, runs: [outward] })
  for (let step = 1; step <= index.count; step++) states.push(index.stateAt(step))
  const replay = importReplay(JSON.stringify(buildNativeReplay(maze, { type: 'repeatedDirected', states }, 'human', true)))
  expect(replay.metrics.totalMoves).toBe(6)
})

it('matches finite progression intersections to explicit enumeration, including opposing and stationary strides', () => {
  let seed = 12345
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed }
  const sequence = () => ({ x: random() % 11 - 5, y: random() % 11 - 5,
    dx: random() % 7 - 3, dy: random() % 7 - 3, count: random() % 7 + 1 })
  for (let trial = 0; trial < 3000; trial++) {
    const a = sequence(), b = sequence()
    const points = new Set(Array.from({ length: a.count }, (_, i) => `${a.x + i * a.dx},${a.y + i * a.dy}`))
    const overlap = Array.from({ length: b.count }, (_, i) => `${b.x + i * b.dx},${b.y + i * b.dy}`).some(key => points.has(key))
    expect(repeatedProgressionsIntersect(a, b), JSON.stringify([a, b])).toBe(overlap)
  }
  const far = { x: Number.MAX_SAFE_INTEGER - 5, y: 0, dx: -1, dy: 0, count: 5 }
  expect(repeatedProgressionsIntersect(far, { ...far, x: far.x - 4, count: 1 })).toBe(true)
  expect(repeatedProgressionsIntersect(far, { ...far, x: far.x - 5, count: 1 })).toBe(false)
  expect(repeatedStateKey(indexRepeatedRoute(long).stateAt(4))).toBe('2,1,W0')
})
