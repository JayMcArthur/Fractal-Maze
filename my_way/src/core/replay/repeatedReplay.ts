import { repeatedNeighbors, repeatedPosition, repeatedStateKey } from '../model/repeatedDirected'
import type { RepeatedDirectedDefinition, RepeatedState, Terminal } from '../model/repeatedDirected'
import { repeatedProgressionsIntersect } from './repeatedProgressions'
import type { RepeatedProgression } from './repeatedProgressions'

export type RepeatedDelta = [number, number, Terminal]
export interface RepeatedRun {
  count: number
  steps: RepeatedDelta[]
}
export type CompactRepeatedRoute = {
  type: 'repeatedDirected'
  start: RepeatedState
  runs: RepeatedRun[]
}
export type RepeatedRoute =
  | { type: 'repeatedDirected'; states: RepeatedState[] }
  | CompactRepeatedRoute

export function repeatedRouteStepCount(route: RepeatedRoute): number {
  return 'states' in route
    ? route.states.length - 1
    : route.runs.reduce((total, run) => total + run.count * run.steps.length, 0)
}

export function indexRepeatedRoute(route: RepeatedRoute) {
  if ('states' in route)
    return {
      count: route.states.length - 1,
      stateAt: (step: number) => route.states[step],
    }
  let current = route.start,
    count = 0
  const runs = route.runs.map((run) => {
    const start = current,
      begin = count
    const offsets = [start]
    for (const [dx, dy, terminal] of run.steps) {
      const previous = offsets.at(-1)!
      offsets.push({ x: previous.x + dx, y: previous.y + dy, terminal })
    }
    const last = offsets.at(-1)!,
      dx = last.x - start.x,
      dy = last.y - start.y
    current = { x: start.x + run.count * dx, y: start.y + run.count * dy, terminal: last.terminal }
    count += run.steps.length * run.count
    return { begin, end: count, start, offsets, dx, dy, terminal: last.terminal }
  })
  const finish = current
  return {
    count,
    stateAt: (step: number): RepeatedState => {
      if (step === count) return finish
      let low = 0,
        high = runs.length - 1
      while (low < high) {
        const mid = Math.floor((low + high) / 2)
        if (step < runs[mid].end) high = mid
        else low = mid + 1
      }
      const run = runs[low],
        length = run.offsets.length - 1
      const repeat = Math.floor((step - run.begin) / length),
        offset = (step - run.begin) % length
      const point = run.offsets[offset]
      return {
        x: point.x + repeat * run.dx,
        y: point.y + repeat * run.dy,
        terminal: offset || !repeat ? point.terminal : run.terminal,
      }
    },
  }
}

function legalMove(def: RepeatedDirectedDefinition, from: RepeatedState, to: RepeatedState) {
  if (![from.x, from.y, to.x, to.y].every((value) => Number.isSafeInteger(value) && value >= 0))
    throw new Error('Replay contains an unsafe repeated-maze coordinate.')
  if ([from, to].some((state) => Number(state.terminal.slice(1)) >= def.terminalsPerSide))
    throw new Error('Replay refers to an unknown terminal.')
  if (!repeatedNeighbors(def, from).some((next) => repeatedStateKey(next) === repeatedStateKey(to)))
    throw new Error('Replay contains an illegal repeated-maze move.')
}

function validateRuns(def: RepeatedDirectedDefinition, route: CompactRepeatedRoute): RepeatedState {
  let current = route.start,
    comparisons = 0
  const seen = new Map<Terminal, RepeatedProgression[]>([
    [current.terminal, [{ x: current.x, y: current.y, dx: 0, dy: 0, count: 1 }]],
  ])
  for (const run of route.runs) {
    const dx = run.steps.reduce((sum, delta) => sum + delta[0], 0)
    const dy = run.steps.reduce((sum, delta) => sum + delta[1], 0)
    const incoming = run.steps.at(-1)![2]
    for (let offset = 0; offset < run.steps.length; offset++) {
      const [mx, my, terminal] = run.steps[offset]
      // Port rules change only at x=0/y=0; first/last test all coordinate extrema.
      const samples = new Set([0, run.count - 1])
      if (run.count > 1) samples.add(1)
      for (const [coordinate, stride] of [
        [current.x, dx],
        [current.y, dy],
      ]) {
        const zero = -coordinate / stride
        if (stride && Number.isInteger(zero) && zero >= 0 && zero < run.count) samples.add(zero)
      }
      for (const repeat of samples) {
        const from = {
          x: current.x + repeat * dx,
          y: current.y + repeat * dy,
          terminal: !offset && repeat ? incoming : current.terminal,
        }
        legalMove(def, from, { x: from.x + mx, y: from.y + my, terminal })
      }
      current = { x: current.x + mx, y: current.y + my, terminal }
      const sequence = { ...current, dx, dy, count: run.count }
      const previous = seen.get(terminal) ?? []
      if (run.count > 1 && !dx && !dy)
        throw new Error('Compact replay must omit repeated-state detours.')
      for (const other of previous) {
        // Bound untrusted import work independently of enormous repeat counts.
        if (++comparisons > 2000000) throw new Error('Compact replay is too complex to validate.')
        if (repeatedProgressionsIntersect(sequence, other))
          throw new Error('Compact replay must omit repeated-state detours.')
      }
      previous.push(sequence)
      seen.set(terminal, previous)
    }
    current = {
      x: current.x + (run.count - 1) * dx,
      y: current.y + (run.count - 1) * dy,
      terminal: incoming,
    }
  }
  return current
}

export function validateRepeatedReplay(
  def: RepeatedDirectedDefinition,
  route: RepeatedRoute,
  complete: boolean
) {
  const start = 'states' in route ? route.states[0] : route.start
  if (repeatedStateKey(start) !== repeatedStateKey(repeatedPosition(def, def.start)))
    throw new Error('Replay must begin at the maze start.')
  if (!Number.isSafeInteger(repeatedRouteStepCount(route)))
    throw new Error('Replay contains an unsafe repeated-maze move count.')
  let finish: RepeatedState
  if ('states' in route) {
    finish = start
    for (let step = 1; step < route.states.length; step++) {
      const next = route.states[step]
      legalMove(def, finish, next)
      finish = next
    }
  } else finish = validateRuns(def, route)
  if (complete && repeatedStateKey(finish) !== repeatedStateKey(repeatedPosition(def, def.goal)))
    throw new Error('Complete replay must reach the maze finish.')
}
