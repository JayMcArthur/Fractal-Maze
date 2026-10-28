import type { PathState, ProofClaim } from '../../core/model/pathMaze'

/** A new starting line invalidates its own trail, never the other recorded descent. */
export function selectProofStart(
  claim: ProofClaim,
  endpoint: 'from' | 'to',
  state: PathState
): Partial<ProofClaim> {
  const side = claim.rule === 'infiniteHop' && endpoint === 'to' ? 'second' : 'first'
  return {
    [endpoint]: state,
    [side]: [],
    period: [],
    ...(claim.setup ? { setup: { ...claim.setup, [side]: [] } } : {}),
  }
}
