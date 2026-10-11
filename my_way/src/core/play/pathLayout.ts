import type { MazeArtwork, PathMazeDefinition, PathState } from '../model/pathMaze'
import {
  artworkRoute,
  distance,
  nearestTracePoint,
  pointAlongRoute,
  type ArtworkPoint,
} from '../pathMaze/artworkRoutes'
import { sameState } from '../pathMaze/traversal'
import {
  crossPathSession,
  crossProofSession,
  walkPathSession,
  type PathPlayPosition,
  type PathSession,
} from './pathSession'
import { proofCrossing } from './proofMovement'

/** Stable anchors map exactly; a free point keeps its progress along the corresponding stroke. */
export function projectPathPosition(
  from: MazeArtwork,
  to: MazeArtwork,
  model: PathMazeDefinition,
  position: PathPlayPosition,
  reachableFrom?: ArtworkPoint,
  reachableTo?: ArtworkPoint
): PathPlayPosition {
  if (!position.point) return position
  const anchors = pathAnchors(from, to, model, position.state)
  const anchor = anchors.find(
    ([oldPoint, newPoint]) => oldPoint && newPoint && distance(oldPoint, position.point!) < 1e-6
  )
  if (anchor) return { state: position.state, point: anchor[1]! }
  const hits = from.traces.filter(trace => trace.path === position.state.path)
    .flatMap(trace => {
      const hit = nearestTracePoint([trace], position.point!)
      return hit ? [hit] : []
    }).sort((a, b) => a.distance - b.distance)
  const length = (points: ArtworkPoint[]) =>
    points.slice(1).reduce((total, point, i) => total + distance(points[i], point), 0)
  for (const hit of hits) {
    if (hit.distance > hits[0].distance + 1e-6) break
    const trace = to.traces.find(trace => trace.id === hit.trace.id)
    if (!trace) continue
    const travelled = length(hit.trace.points.slice(0, hit.segment + 1)) +
      distance(hit.trace.points[hit.segment], hit.point)
    const point = pointAlongRoute(trace.points,
      (travelled / length(hit.trace.points)) * length(trace.points))
    if (reachableFrom && !artworkRoute(to, position.state.path, reachableFrom, point)) continue
    if (reachableTo && !artworkRoute(to, position.state.path, point, reachableTo)) continue
    return { state: position.state, point }
  }
  return position
}

export function projectPathSession(
  session: PathSession,
  from: MazeArtwork,
  to: MazeArtwork,
  model: PathMazeDefinition
): PathSession {
  if (!session.positions.length) return session
  let projected: PathSession = {
    positions: [projectPathPosition(from, to, model, session.positions[0])],
    moves: [],
  }
  for (let i = 0; i < session.moves.length; i++) {
    const move = session.moves[i]
    if (move.kind === 'cross') {
      const next = crossPathSession(projected, model, to, move.route.edges[0])
      if (next === projected) throw new Error('The selected layout cannot follow this copy crossing.')
      projected = next
    }
    else if (move.kind === 'lemma') {
      const next = crossProofSession(projected, model, to, move.step)
      if (next === projected) throw new Error('The selected layout cannot follow this checked proof.')
      projected = next
    } else {
      const current = projected.positions.at(-1)!
      const onward = session.moves.slice(i + 1).find(move => move.kind !== 'walk')
      const departure = onward?.kind === 'cross'
        ? to.gates?.find(gate => gate.edge === onward.route.edges[0])?.from
        : onward?.kind === 'lemma'
          ? proofCrossing(model, to, current, onward.step)?.motion?.departure.at(-1) : undefined
      const next = projectPathPosition(from, to, model, session.positions[i + 1], current.point, departure)
      const route =
        current.point &&
        next.point &&
        artworkRoute(to, current.state.path, current.point, next.point)
      if (!route) throw new Error('The selected layout has no corresponding route for this walk.')
      if (distance(route[0], current.point!) > 1e-6) route.unshift(current.point!)
      projected = walkPathSession(projected, route)
    }
  }
  return projected
}

function pathAnchors(
  from: MazeArtwork,
  to: MazeArtwork,
  model: PathMazeDefinition,
  state: PathState
) {
  const anchors: [ArtworkPoint | undefined, ArtworkPoint | undefined][] = []
  if (model.start && sameState(state, model.start)) anchors.push([from.start, to.start])
  if (model.goal && sameState(state, model.goal)) anchors.push([from.goal, to.goal])
  for (const finish of from.finishes ?? [])
    if (sameState(state, finish.state))
      anchors.push([
        finish.point,
        to.finishes?.find((other) => sameState(other.state, finish.state))?.point,
      ])
  for (const gate of from.gates ?? []) {
    const edge = model.connections.find((edge) => edge.id === gate.edge)
    const target = to.gates?.find((target) => target.edge === gate.edge)
    if (edge?.from === state.path) anchors.push([gate.from, target?.from])
    if (edge?.to === state.path) anchors.push([gate.to, target?.to])
  }
  return anchors
}
