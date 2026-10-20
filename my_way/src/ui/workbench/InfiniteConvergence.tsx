import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { infiniteWitness } from '../../core/pathMaze/proofs'
import { sameState } from '../../core/pathMaze/traversal'

export function InfiniteConvergence({
  model,
  claim,
  accepted,
  saved = false,
}: {
  model: PathMazeDefinition
  claim: ProofClaim
  accepted: ProofClaim[]
  saved?: boolean
}) {
  const witnesses = (['first', 'second'] as const).map((side) =>
    infiniteWitness(model, claim, accepted, side)
  )
  const ready =
    claim.period.length > 0 &&
    witnesses.every(
      (w) => !w.setup.error && !w.cycle.error && sameState(w.cycle.states.at(-1)!, w.target)
    )
  const word = (address: string[]) => address.join(' → ') || 'surface'
  return (
    <section className="workbench-card convergence" aria-label="Infinite trail comparison">
      <h2>{saved ? 'Repeating trails' : '3. Compare the repeating trails'}</h2>
      {claim.period.length > 0 && (
        <p>
          <strong>Limit address:</strong> {claim.scope.length > 0 ? `${word(claim.scope)} → ` : ''}(
          {word(claim.period)}) forever
        </p>
      )}
      <p role="status">
        {ready
          ? saved
            ? 'The recorded trails repeat toward the same limit address.'
            : 'Both repeating witnesses reach their targets. Check the proof to validate the connection.'
          : claim.period.length === 0
            ? 'Build both trails by moving through the mazes. Their shared repeating copies will be detected.'
            : 'Complete both repeating witnesses to compare their trails.'}
      </p>
      {claim.period.length > 0 && (
        <details>
          <summary>Compare copy addresses</summary>
          <div className="witness-grid">
            {witnesses.map((w, index) => (
              <div key={index}>
                <h3>{index === 0 ? 'Left' : 'Right'} trail</h3>
                <ol>
                  {[0, 1, 2, 3].map((count) => (
                    <li key={count}>
                      <code>
                        {word([
                          ...w.anchor.address.slice(0, claim.scope.length),
                          ...Array.from({ length: count }, () => claim.period).flat(),
                          ...w.anchor.address.slice(claim.scope.length),
                        ])}
                      </code>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
