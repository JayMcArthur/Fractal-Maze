import type { MazeArtwork, PathMazeDefinition, PathState } from '../model/pathMaze'
import { artworkRoute, type ArtworkPoint } from '../pathMaze/artworkRoutes'
import { applyConnection, reachesGoal, sameState } from '../pathMaze/traversal'

export interface PathPosition {
  state: PathState
  point: ArtworkPoint
}

export function pathArrivalPoint(artwork: MazeArtwork, model: PathMazeDefinition,
  state: PathState, arrivalEdge?: string): ArtworkPoint {
  return artwork.gates?.find(gate => gate.edge === arrivalEdge)?.to ??
    (model.start && sameState(state, model.start) ? artwork.start : undefined) ??
    artwork.traces.find(trace => trace.path === state.path)!.points[0]
}

/** A PDA crossing has departure travel, an address change, and travel inside the new copy. */
export function pathMotionRoutes(artwork: MazeArtwork, model: PathMazeDefinition,
  previous: PathPosition, current: PathState, arrivalEdges?: string[]) {
  const arrival = artwork.gates?.find(gate => gate.edge === arrivalEdges?.at(-1))
  const departureGate = artwork.gates?.find(gate => gate.edge === arrivalEdges?.[0])
  const next = arrivalEdges?.reduce<PathState | null>((state, id) => {
    const edge = model.connections.find(edge => edge.id === id)
    return state && edge ? applyConnection(state, edge) : null
  }, previous.state)
  const forward = next && departureGate && sameState(next, current)
  const departure = forward
    ? artworkRoute(artwork, previous.state.path, previous.point, departureGate.from) : null
  const target = pathArrivalPoint(artwork, model, current, arrivalEdges?.at(-1))
  const finish = artwork.finishes?.find(finish => sameState(finish.state, current))?.point ?? artwork.goal
  const destination = reachesGoal(model, current) && finish ? finish : target
  const entry = arrival?.arrivalFrom ?? target
  return { departure, entry, arrivalMotion: artworkRoute(artwork, current.path, entry, destination) }
}
