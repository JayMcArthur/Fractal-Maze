import type { PathMazeDefinition, ProofClaim, ProofStep } from '../model/pathMaze'
import { applyProofStep, checkedClaims } from '../pathMaze/proofs'
import { sameState, reachesGoal } from '../pathMaze/traversal'
import type { PathRoute } from '../pathMaze/traversal'

export function proofSolutionClaim(def: PathMazeDefinition, steps: ProofStep[]): ProofClaim {
  return { id: 'solution-route', rule: 'connection', from: def.start!, to: def.goal!, scope: [], period: [], first: steps, second: [] }
}

export function validateProofReplay(def: PathMazeDefinition, route: PathRoute & { proofSteps: ProofStep[] }, complete: boolean) {
  if (!def.start || !def.goal || !sameState(route.states[0], def.start) || route.proofSteps.length !== route.states.length - 1)
    throw new Error('Proof replay must begin at the entry and record every step.')
  const claims = checkedClaims(def), claim = proofSolutionClaim(def, route.proofSteps)
  for (const [index, step] of route.proofSteps.entries()) {
    if (step.kind === 'hypothesis' || route.edges[index] !== step.reference)
      throw new Error('Proof replay steps must use ordinary edges or checked claims.')
    const next = applyProofStep(def, route.states[index], step, claim, claims)
    if (!next || !sameState(next, route.states[index + 1])) throw new Error('Proof replay contains an unchecked connection.')
  }
  if (complete && !reachesGoal(def, route.states.at(-1)!)) throw new Error('Proof replay must reach the finish.')
}
