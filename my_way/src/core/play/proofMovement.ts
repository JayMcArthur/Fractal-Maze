import type { MazeArtwork, PathMazeDefinition, ProofClaim } from '../model/pathMaze'
import { applyProofStep, checkedClaims, declaredConnections } from '../pathMaze/proofs'
import { artworkRoute, type ArtworkPoint } from '../pathMaze/artworkRoutes'
import { reachesGoal, sameState } from '../pathMaze/traversal'
import type { PathPlayPosition } from './pathSession'

export interface CheckedProofStep {
  kind: 'lemma'
  reference: string
  reverse: boolean
}

type Pair = ReturnType<typeof declaredConnections>[number]

/** Find the actual boundary of a proof, including nested lemmas and joint hypotheses. */
function proofBoundary(
  artwork: MazeArtwork,
  claim: ProofClaim,
  pair: Pair,
  side: 'from' | 'to',
  accepted: ProofClaim[],
  seen = new Set<string>()
): ArtworkPoint | undefined {
  const key = `${pair.id}:${side}`
  if (seen.has(key)) return undefined
  seen.add(key)
  const infinite = claim.rule === 'infiniteHop'
  const trail = side === 'from' ? 'first' : 'second'
  const steps = infinite ? [...(claim.setup?.[trail] ?? []), ...claim[trail]] : pair.witness
  const step = infinite || side === 'from' ? steps[0] : steps.at(-1)
  if (!step) return undefined
  const boundary = infinite ? 'from' : side
  if (step.kind === 'edge') {
    const gate = artwork.gates?.find((gate) => gate.edge === step.reference)
    return gate?.[boundary]
  }
  const owner =
    step.kind === 'hypothesis'
      ? claim
      : accepted.find((lemma) =>
          declaredConnections(lemma).some((connection) => connection.id === step.reference)
        )
  const connection = owner && declaredConnections(owner).find((pair) => pair.id === step.reference)
  if (!owner || !connection) return undefined
  return proofBoundary(
    artwork,
    owner,
    connection,
    step.reverse ? (boundary === 'from' ? 'to' : 'from') : boundary,
    accepted,
    seen
  )
}

/** Checked claims extend logical reachability; geometry still controls the approach and arrival. */
export function proofCrossing(
  model: PathMazeDefinition,
  artwork: MazeArtwork | undefined,
  current: PathPlayPosition,
  step: CheckedProofStep,
  accepted = checkedClaims(model)
) {
  const claim = accepted.find((claim) =>
    declaredConnections(claim).some((pair) => pair.id === step.reference)
  )
  const pair = claim && declaredConnections(claim).find((pair) => pair.id === step.reference)
  if (!claim || !pair) return null
  const state = applyProofStep(model, current.state, step, claim, accepted)
  if (!state) return null
  const move = { kind: 'lemma' as const, step }
  if (!artwork?.traces.length) return { claim, move, position: { state } }
  if (!current.point) return null
  const from = proofBoundary(artwork, claim, pair, step.reverse ? 'to' : 'from', accepted)
  const entry = proofBoundary(artwork, claim, pair, step.reverse ? 'from' : 'to', accepted)
  if (!from || !entry) return null
  const finish =
    artwork.finishes?.find((finish) => sameState(finish.state, state))?.point ?? artwork.goal
  const target = reachesGoal(model, state) && finish ? finish : entry
  const departure = artworkRoute(artwork, current.state.path, current.point, from)
  const arrivalMotion = artworkRoute(artwork, state.path, entry, target)
  if (!departure || !arrivalMotion) return null
  return {
    claim,
    move,
    position: { state, point: arrivalMotion.at(-1)! },
    motion: { departure, entry, arrivalMotion },
  }
}

export function availableProofMoves(
  model: PathMazeDefinition,
  artwork: MazeArtwork | undefined,
  current: PathPlayPosition
) {
  const accepted = checkedClaims(model)
  return accepted.flatMap((claim) =>
    declaredConnections(claim).flatMap((pair) =>
      [false, true].flatMap((reverse) => {
        const step: CheckedProofStep = { kind: 'lemma', reference: pair.id, reverse }
        const crossing = proofCrossing(model, artwork, current, step, accepted)
        return crossing ? [crossing] : []
      })
    )
  )
}
