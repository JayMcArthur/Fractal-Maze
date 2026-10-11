import type { MazeArtwork, PathMazeDefinition, PathState } from '../model/pathMaze'
import { distance, type ArtworkPoint } from '../pathMaze/artworkRoutes'
import { reachesGoal, sameState, type PathRoute } from '../pathMaze/traversal'
import { pathMoveSequence } from './pathMovement'
import { pathArrivalPoint, pathMotionRoutes } from './pathGeometry'
import { proofCrossing, type CheckedProofStep } from './proofMovement'
import type { ProofStep } from '../model/pathMaze'

export interface PathPlayPosition {
  state: PathState
  point?: ArtworkPoint
}
export type PathPlayMove =
  | { kind: 'walk'; points: ArtworkPoint[] }
  | { kind: 'cross'; route: PathRoute }
  | { kind: 'lemma'; step: CheckedProofStep }
export interface PathSession {
  positions: PathPlayPosition[]
  moves: PathPlayMove[]
}
export interface PathPlayFrame {
  position: PathPlayPosition
  from?: PathPlayPosition
  move?: PathPlayMove
}

export function initialPathSession(model: PathMazeDefinition, artwork?: MazeArtwork): PathSession {
  if (!model.start) return { positions: [], moves: [] }
  const point = artwork?.traces.some((trace) => trace.path === model.start!.path)
    ? pathArrivalPoint(artwork, model, model.start)
    : undefined
  return { positions: [{ state: model.start, ...(point ? { point } : {}) }], moves: [] }
}

export function samePlayPosition(a: PathPlayPosition, b: PathPlayPosition) {
  return (
    sameState(a.state, b.state) &&
    (a.point && b.point ? distance(a.point, b.point) < 1e-6 : a.point === b.point)
  )
}

/** A detour ends only at the same address, path and physical point. */
export function appendSessionMove(
  session: PathSession,
  move: PathPlayMove,
  next: PathPlayPosition
): PathSession {
  const previous = session.positions.findIndex((position) => samePlayPosition(position, next))
  if (previous >= 0)
    return {
      positions: session.positions.slice(0, previous + 1),
      moves: session.moves.slice(0, previous),
    }
  return { positions: [...session.positions, next], moves: [...session.moves, move] }
}

export function walkPathSession(session: PathSession, points: ArtworkPoint[]): PathSession {
  const current = session.positions.at(-1)
  if (!current?.point || points.length < 2 || distance(current.point, points[0]) > 1e-6)
    return session
  return appendSessionMove(
    session,
    { kind: 'walk', points },
    { state: current.state, point: points.at(-1)! }
  )
}

export function crossPathSession(
  session: PathSession,
  model: PathMazeDefinition,
  artwork: MazeArtwork | undefined,
  edge: string
): PathSession {
  const current = session.positions.at(-1)
  if (!current) return session
  const crossing = pathCrossing(model, artwork, current, edge)
  return crossing ? appendSessionMove(session, crossing.move, crossing.position) : session
}

export function pathCrossing(
  model: PathMazeDefinition,
  artwork: MazeArtwork | undefined,
  current: PathPlayPosition,
  edge: string
) {
  const route = pathMoveSequence(model, current.state, edge)
  if (!route) return null
  const state = route.states.at(-1)!
  let point: ArtworkPoint | undefined
  if (artwork && current.point && artwork.traces.some((trace) => trace.path === state.path)) {
    const motion = pathMotionRoutes(
      artwork,
      model,
      { state: current.state, point: current.point },
      state,
      route.edges
    )
    if (!motion.departure || !motion.arrivalMotion) return null
    point = motion.arrivalMotion.at(-1)
  }
  return {
    from: current,
    move: { kind: 'cross' as const, route },
    position: { state, ...(point ? { point } : {}) },
  }
}

export function crossProofSession(session: PathSession, model: PathMazeDefinition,
  artwork: MazeArtwork | undefined, step: CheckedProofStep): PathSession {
  const current = session.positions.at(-1)
  if (!current) return session
  const crossing = proofCrossing(model, artwork, current, step)
  return crossing ? appendSessionMove(session, crossing.move, crossing.position) : session
}

export const undoPathSession = (session: PathSession): PathSession => ({
  positions: session.positions.slice(0, Math.max(1, session.positions.length - 1)),
  moves: session.moves.slice(0, -1),
})

export function pathSessionFinished(
  model: PathMazeDefinition,
  artwork: MazeArtwork | undefined,
  position: PathPlayPosition | undefined
) {
  if (!position || !reachesGoal(model, position.state)) return false
  const finish =
    artwork?.finishes?.find((finish) => sameState(finish.state, position.state))?.point ??
    artwork?.goal
  return (
    !finish || (!!position.point && distance(position.point, finish) <= artwork!.bounds[2] / 400)
  )
}

export function sessionPathRoute(session: PathSession): PathRoute & { proofSteps?: ProofStep[] } {
  const states = session.positions.length ? [session.positions[0].state] : [],
    edges: string[] = [], proofSteps: ProofStep[] = []
  for (const [index, move] of session.moves.entries())
    if (move.kind === 'cross') {
      states.push(...move.route.states.slice(1))
      edges.push(...move.route.edges)
      proofSteps.push(...move.route.edges.map(reference => ({ kind: 'edge' as const, reference, reverse: false })))
    }
    else if (move.kind === 'lemma') {
      states.push(session.positions[index + 1].state)
      edges.push(move.step.reference)
      proofSteps.push(move.step)
    }
  return { states, edges, ...(session.moves.some(move => move.kind === 'lemma')
    ? { proofSteps } : {}) }
}

/** Group a solver witness into the same complete crossings used by live play. */
export function pathRouteSession(model: PathMazeDefinition, artwork: MazeArtwork,
  route: PathRoute & { proofSteps?: ProofStep[] }): PathSession {
  const session = initialPathSession(model, artwork)
  if (!sameState(session.positions[0].state, route.states[0]))
    throw new Error('Recorded route must start at the maze entry.')
  for (let index = 0; index < route.edges.length;) {
    const step = route.proofSteps?.[index]
    if (step?.kind === 'lemma') {
      const crossing = proofCrossing(model, artwork, session.positions.at(-1)!, { ...step, kind: 'lemma' })
      if (!crossing || route.edges[index] !== step.reference ||
        !sameState(crossing.position.state, route.states[index + 1]))
        throw new Error('Recorded route contains an unchecked or disconnected proof connection.')
      session.positions.push(crossing.position)
      session.moves.push(crossing.move)
      index++
      continue
    }
    const crossed = pathCrossing(model, artwork, session.positions.at(-1)!, route.edges[index])
    if (!crossed || crossed.move.route.edges.some((edge, offset) =>
      edge !== route.edges[index + offset] ||
      !sameState(crossed.move.route.states[offset + 1], route.states[index + offset + 1]) ||
      (route.proofSteps && route.proofSteps[index + offset]?.kind !== 'edge')))
      throw new Error('Recorded route contains an incomplete or different copy crossing.')
    session.positions.push(crossed.position)
    session.moves.push(crossed.move)
    index += crossed.move.route.edges.length
  }
  return session
}
