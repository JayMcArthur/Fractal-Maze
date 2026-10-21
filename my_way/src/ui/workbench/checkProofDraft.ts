import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { inferInfinitePeriod } from '../../core/pathMaze/inferInfinitePeriod'
import { checkClaim, infiniteWitness, type ProofCheck } from '../../core/pathMaze/proofs'

/** Explain unfinished graphical trails before asking the certificate checker to validate them. */
export function checkProofDraft(
  model: PathMazeDefinition,
  claim: ProofClaim,
  accepted: ProofClaim[]
) {
  const period = inferInfinitePeriod(model, claim, accepted)
  const candidate = period ? { ...claim, period } : claim
  return { claim: candidate, result: checkDraft(model, candidate, accepted) }
}

function checkDraft(
  model: PathMazeDefinition,
  claim: ProofClaim,
  accepted: ProofClaim[]
): ProofCheck {
  if (claim.rule !== 'infiniteHop' || claim.period.length) return checkClaim(model, claim, accepted)
  const fail = (message: string): ProofCheck => ({ valid: false, message, first: [], second: [] })
  for (const side of ['first', 'second'] as const) {
    const name = side === 'first' ? 'Left trail' : 'Right trail'
    const { setup, anchor, cycle } = infiniteWitness(model, claim, accepted, side)
    if (setup.error || cycle.error) return fail(`${name}: ${setup.error ?? cycle.error}`)
    const end = cycle.states.at(-1)!
    const line = model.paths.find((path) => path.id === anchor.path)?.label
    if (end.path !== anchor.path || end.address.length <= anchor.address.length)
      return fail(
        `${name}: return to Line ${line} inside a deeper copy. Cross a copy gate to record the descent.`
      )
  }
  const left = infiniteWitness(model, claim, accepted, 'first')
  const end = left.cycle.states.at(-1)!
  const added = end.address.length - left.anchor.address.length
  // A candidate is only diagnostic: acceptance still goes through the full certificate checker.
  return checkClaim(
    model,
    { ...claim, period: end.address.slice(claim.scope.length, claim.scope.length + added) },
    accepted
  )
}
