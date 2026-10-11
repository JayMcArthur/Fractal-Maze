import type { MazeArtwork, PathMazeDefinition } from '../model/pathMaze'
import type { PortState, RecursivePortsDefinition } from '../model/recursivePorts'
import { initialPathSession, pathCrossing, type PathSession } from '../play/pathSession'
import { portPathState } from '../play/portPDA'
import { availableMoves, sameState } from '../pathMaze/traversal'
import { pathMoveSequence } from '../play/pathMovement'

/** Preserve one recorded port move per frame while replaying its exact PDA witness. */
export function portReplaySession(
  def: RecursivePortsDefinition,
  model: PathMazeDefinition,
  artwork: MazeArtwork,
  states: PortState[]
): PathSession {
  const session = initialPathSession(model, artwork)
  for (const state of states.slice(1)) {
    const current = session.positions.at(-1)!
    const target = portPathState(def, state)
    const move = availableMoves(model, current.state).find(move =>
      sameState(pathMoveSequence(model, current.state, move.edge.id)!.states.at(-1)!, target))
    if (!move) throw new Error('Recorded port move does not match the maze PDA.')
    const crossing = pathCrossing(model, artwork, current, move.edge.id)!
    session.positions.push(crossing.position)
    session.moves.push(crossing.move)
  }
  return session
}
