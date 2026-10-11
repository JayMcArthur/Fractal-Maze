import type { RepeatedDirectedDefinition, RepeatedState } from '../../model/repeatedDirected'
import { repeatedPosition, repeatedNeighbors, repeatedStateKey } from '../../model/repeatedDirected'

export interface RepeatedSolveResult { status: 'solved' | 'bounded'; path: RepeatedState[]; visited: number }
export function solveRepeated(def: RepeatedDirectedDefinition, coordinateLimit: number, maxNodes = 100_000): RepeatedSolveResult {
  const start = repeatedPosition(def, def.start), goal = repeatedStateKey(repeatedPosition(def, def.goal))
  const queue = [start], parents = [-1], seen = new Set([repeatedStateKey(start)])
  for (let cursor = 0; cursor < queue.length; cursor++) {
    if (repeatedStateKey(queue[cursor]) === goal) {
      const path: RepeatedState[] = []
      for (let index = cursor; index >= 0; index = parents[index]) path.push(queue[index])
      return { status: 'solved', path: path.reverse(), visited: seen.size }
    }
    for (const next of repeatedNeighbors(def, queue[cursor])) {
      const key = repeatedStateKey(next)
      if (next.x > coordinateLimit || next.y > coordinateLimit || seen.has(key)) continue
      if (seen.size >= maxNodes) return { status: 'bounded', path: [], visited: seen.size }
      seen.add(key); queue.push(next); parents.push(cursor)
    }
  }
  return { status: 'bounded', path: [], visited: seen.size }
}
