import type { PathConnection, PathMazeDefinition, PathState } from '../model/pathMaze'
import { availableMoves, reachesGoal, sameState, type PathRoute } from '../pathMaze/traversal'

/** Point helpers split a physical crossing into PDA operations, not player decisions. */
export function pathMoveSequence(
  model: PathMazeDefinition,
  start: PathState,
  edge: string
): PathRoute | null {
  const move = availableMoves(model, start).find((move) => move.edge.id === edge)
  if (!move) return null
  const states = [start, move.next],
    edges = [move.edge.id],
    helpers = new Set<string>()
  while (model.paths.find((path) => path.id === states.at(-1)!.path)?.helper) {
    const current = states.at(-1)!
    if (reachesGoal(model, current) || helpers.has(current.path)) break
    helpers.add(current.path)
    const moves = availableMoves(model, current)
    const onward = moves.filter(
      (move) => !sameState(move.next, states.at(-2)!)
    )
    const next = onward.length === 1 ? onward[0] : moves.length === 1 ? moves[0] : null
    if (!next) break
    states.push(next.next)
    edges.push(next.edge.id)
  }
  return { states, edges }
}

/** Describe the geometric crossing rather than its intermediate bookkeeping state. */
export function pathMoveDescription(
  model: PathMazeDefinition,
  start: PathState,
  edge: PathConnection
) {
  const crossing = pathMoveSequence(model, start, edge.id)!
  const end = crossing.states.at(-1)!
  const path = model.paths.find((path) => path.id === end.path)!.label
  const copies = crossing.edges
    .map((id) => model.connections.find((connection) => connection.id === id)!)
    .filter((connection) => connection.operation === edge.operation)
    .map((connection) => connection.copy)
    .join(' → ')
  const action =
    edge.operation === 'exit' && !end.address.length && model.surfaceSymbols?.includes(edge.copy) && reachesGoal(model, end)
      ? 'Finish'
      : edge.operation !== 'walk' && end.address.length === start.address.length
      ? 'Cross'
      : edge.operation === 'walk'
      ? 'Walk'
      : `${edge.operation === 'enter' ? 'Enter' : 'Exit'} ${copies}`
  return { action, path }
}
