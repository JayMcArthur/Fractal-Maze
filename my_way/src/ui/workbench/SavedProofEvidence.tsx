import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { declaredConnections, traceWitness } from '../../core/pathMaze/proofs'
import { WitnessRoute } from './WitnessRoute'
import { InfiniteConvergence } from './InfiniteConvergence'
import { stateLabel } from '../../core/pathMaze/traversal'

export function SavedProofEvidence({
  model,
  claim,
  accepted,
}: {
  model: PathMazeDefinition
  claim: ProofClaim
  accepted: ProofClaim[]
}) {
  const witnesses = declaredConnections(claim).map((pair) => ({
    start: pair.from,
    target: pair.to,
    steps: pair.witness,
  }))
  if (claim.rule === 'infiniteHop') witnesses.push({ start: claim.to, target: claim.from, steps: claim.second })
  return (
    <div className="saved-proof-evidence">
      {claim.rule === 'infiniteHop' && (
        <InfiniteConvergence model={model} claim={claim} accepted={accepted} saved />
      )}
      {witnesses.map(({ start, target, steps }, index) => {
        const setupSteps = claim.rule === 'infiniteHop' ? claim.setup?.[index === 0 ? 'first' : 'second'] ?? [] : []
        const setup = traceWitness(model, start, setupSteps, claim, accepted)
        const traced = traceWitness(model, setup.states.at(-1)!, steps, claim, accepted)
        return (
          <details className="saved-proof-witness" key={index} open={index === 0}>
            <summary>
              {claim.rule === 'infiniteHop' ? `${index === 0 ? 'Left' : 'Right'} trail` : `${stateLabel(start, model)} ${claim.rule === 'finite' ? '→' : '↔'} ${stateLabel(target, model)}`} · {steps.length} steps
            </summary>
            {setupSteps.length > 0 && <WitnessRoute model={model} states={setup.states} steps={setupSteps} error={setup.error} />}
            <WitnessRoute model={model} states={traced.states} steps={steps} error={traced.error} />
          </details>
        )
      })}
    </div>
  )
}
