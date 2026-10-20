import {
  portMoves,
  portStateKey,
  type PortState,
  type RecursivePortsDefinition,
} from '../../model/recursivePorts'
export interface PortSolveResult {
  status: 'solved' | 'limit' | 'exhausted'
  path: PortState[]
  visited: number
}
export function solvePorts(
  def: RecursivePortsDefinition,
  maxDepth: number,
  maxStates = 100000
): PortSolveResult {
  const queue = [def.start],
    parents = [-1],
    seen = new Set([portStateKey(def.start)])
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const state = queue[cursor]
    if (portStateKey(state) === portStateKey(def.goal)) {
      const path: PortState[] = []
      for (let index = cursor; index !== -1; index = parents[index]) path.push(queue[index])
      return { status: 'solved', path: path.reverse(), visited: seen.size }
    }
    for (const move of portMoves(def, state, maxDepth)) {
      const key = portStateKey(move.state)
      if (seen.has(key)) continue
      if (seen.size >= maxStates) return { status: 'limit', path: [], visited: seen.size }
      seen.add(key)
      queue.push(move.state)
      parents.push(cursor)
    }
  }
  return { status: 'exhausted', path: [], visited: seen.size }
}
