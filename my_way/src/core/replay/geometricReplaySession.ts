import type { GeometricMaze } from '../model/geometricRecursive'
import type { MazeArtwork, PathMazeDefinition } from '../model/pathMaze'
import type { NativeRoute } from './nativeReplay'
import { initialPathSession, pathCrossing } from '../play/pathSession'
import { geometricPathState } from '../play/geometricPDA'
import { sameState } from '../pathMaze/traversal'

/** Keep every archived gate action, including its explicit surface-finish frame. */
export function geometricReplaySession(maze: GeometricMaze, model: PathMazeDefinition,
  artwork: MazeArtwork, route: Extract<NativeRoute, { type: 'geometricRecursive' }>) {
  const session = initialPathSession(model, artwork)
  if (!sameState(session.positions[0].state, geometricPathState(maze, route.states[0])))
    throw new Error('Recorded geometric route must start at the maze entry.')
  for (const [index, gate] of route.gates.entries()) {
    const previous = route.states[index], next = route.states[index + 1]
    const [owner, port] = gate.split(':')
    const edge = next.won ? `finish:${gate}` : owner === '_'
      ? `exit:${previous.stack.at(-1)}:${port}` : `enter:${gate}`
    const crossing = pathCrossing(model, artwork, session.positions.at(-1)!, edge)
    if (!crossing || !sameState(crossing.position.state, geometricPathState(maze, next)))
      throw new Error('Recorded geometric move does not match its physical PDA crossing.')
    session.positions.push(crossing.position)
    session.moves.push(crossing.move)
  }
  return session
}
