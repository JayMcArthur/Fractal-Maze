import type { PathMazeDefinition, ProofClaim } from '../model/pathMaze'
import { checkClaim, traceWitness } from './proofs'

/** Infer the inserted copy word from the routes the player built, never search for a route. */
export function inferInfinitePeriod(
  model: PathMazeDefinition,
  claim: ProofClaim,
  accepted: ProofClaim[] = []
): string[] | null {
  if (claim.rule !== 'infiniteHop') return null
  const words = (['first', 'second'] as const).map((side) => {
    const start = side === 'first' ? claim.from : claim.to
    const setup = traceWitness(model, start, claim.setup?.[side] ?? [], claim, accepted)
    const anchor = setup.states.at(-1)!
    const cycle = traceWitness(model, anchor, claim[side], claim, accepted)
    const end = cycle.states.at(-1)!
    const added = end.address.length - anchor.address.length
    if (setup.error || cycle.error || end.path !== anchor.path || added <= 0) return null
    const word = end.address.slice(claim.scope.length, claim.scope.length + added)
    const expected = [...claim.scope, ...word, ...anchor.address.slice(claim.scope.length)]
    return end.address.length === expected.length &&
      end.address.every((copy, i) => copy === expected[i])
      ? word
      : null
  })
  const [left, right] = words
  if (!left || !right || left.length !== right.length || left.some((copy, i) => copy !== right[i]))
    return null
  return checkClaim(model, { ...claim, period: left }, accepted).valid ? left : null
}
