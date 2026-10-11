import { z } from 'zod'
import type { MazeArtwork, PathMazeDefinition, ProofStep } from '../model/pathMaze'
import { proofCrossing } from '../play/proofMovement'
import { proofStepSchema } from '../pathMaze/validation'
import {
  artworkRoute,
  distance,
  nearestTracePoint,
  type ArtworkPoint,
} from '../pathMaze/artworkRoutes'
import { sameState, type PathRoute } from '../pathMaze/traversal'
import {
  pathCrossing,
  initialPathSession,
  samePlayPosition,
  sessionPathRoute,
  type PathSession,
  type PathPlayPosition,
} from '../play/pathSession'

const state = z.object({ path: z.string(), address: z.array(z.string()) })
const point = z.tuple([z.number().finite(), z.number().finite()])
const route = z.object({ states: z.array(state).min(1), edges: z.array(z.string()) })
export const pathSessionSchema = z.object({
  positions: z.array(z.object({ state, point: point.optional() })).min(1),
  moves: z.array(
    z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('walk'), points: z.array(point).min(2) }),
      z.object({ kind: z.literal('cross'), route }),
      z.object({ kind: z.literal('lemma'), step: proofStepSchema.extend({ kind: z.literal('lemma') }) }),
    ])
  ),
})

const length = (points: ArtworkPoint[]) =>
  points.slice(1).reduce((sum, point, i) => sum + distance(points[i], point), 0)

export function validatePathSession(
  model: PathMazeDefinition,
  artwork: MazeArtwork | undefined,
  session: PathSession,
  witness: PathRoute & { proofSteps?: ProofStep[] },
  complete: boolean
) {
  if (
    !artwork ||
    session.positions.length !== session.moves.length + 1 ||
    !samePlayPosition(session.positions[0], initialPathSession(model, artwork).positions[0])
  )
    throw new Error('Physical replay must start at the maze entry and record every movement.')
  const tolerance = artwork.bounds[2] / 400
  for (let i = 0; i < session.moves.length; i++) {
    const from = session.positions[i],
      to = session.positions[i + 1],
      move = session.moves[i]
    if (!from.point || !to.point) throw new Error('Physical replay is missing a path position.')
    if (move.kind === 'cross') validateCrossing(model, artwork, from, to, move.route)
    else if (move.kind === 'lemma') {
      const crossing = proofCrossing(model, artwork, from, move.step)
      if (!crossing || !samePlayPosition(crossing.position, to))
        throw new Error('Physical replay contains an unchecked or disconnected proof connection.')
    }
    else
      validateWalk(
        artwork,
        { state: from.state, point: from.point },
        { state: to.state, point: to.point },
        move.points
      )
  }
  if (
    JSON.stringify(sessionPathRoute(session)) !==
    JSON.stringify({ states: witness.states, edges: witness.edges, ...(witness.proofSteps ? { proofSteps: witness.proofSteps } : {}) })
  )
    throw new Error('Physical replay and its PDA transitions disagree.')
  if (complete) {
    const last = session.positions.at(-1)!
    const finish =
      artwork.finishes?.find((finish) => sameState(finish.state, last.state))?.point ?? artwork.goal
    if (!finish || !last.point || distance(finish, last.point) > tolerance)
      throw new Error('Complete physical replay must reach the drawn finish.')
  }
}

function validateCrossing(
  model: PathMazeDefinition,
  artwork: MazeArtwork,
  from: PathPlayPosition,
  to: PathPlayPosition,
  route: PathRoute
) {
  const crossed = pathCrossing(model, artwork, from, route.edges[0])
  if (
    !crossed ||
    JSON.stringify(crossed.move.route) !== JSON.stringify(route) ||
    !samePlayPosition(crossed.position, to)
  )
    throw new Error('Physical replay contains an illegal copy crossing.')
}

function validateWalk(
  artwork: MazeArtwork,
  from: { state: PathPlayPosition['state']; point: ArtworkPoint },
  to: { state: PathPlayPosition['state']; point: ArtworkPoint },
  points: ArtworkPoint[]
) {
  const tolerance = artwork.bounds[2] / 400
  if (
    !sameState(from.state, to.state) ||
    distance(from.point, points[0]) > 1e-6 ||
    distance(to.point, points.at(-1)!) > 1e-6
  )
    throw new Error('Physical replay walk does not match its path positions.')
  const traces = artwork.traces.filter((trace) => trace.path === from.state.path)
  for (let j = 0; j < points.length; j++) {
    const hit = nearestTracePoint(traces, points[j])
    const segment = j ? artworkRoute(artwork, from.state.path, points[j - 1], points[j]) : null
    if (
      !hit ||
      hit.distance > tolerance ||
      (j &&
        (!segment ||
          Math.abs(length(segment) - distance(points[j - 1], points[j])) > tolerance * 2))
    )
      throw new Error('Physical replay leaves its connected, directed maze path.')
  }
}
