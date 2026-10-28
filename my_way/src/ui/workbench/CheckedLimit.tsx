import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { CopyAddress } from '../components/CopyAddress'

/** A checked common limit, not a new movement rule or a finite destination. */
export function CheckedLimit({ model, claim }: { model: PathMazeDefinition; claim: ProofClaim }) {
  if (claim.rule !== 'infiniteHop') return null
  const line = (path: string) => model.paths.find((item) => item.id === path)?.label ?? path
  return (
    <div className="checked-limit" aria-label="Shared infinite limit">
      <div className="checked-limit__lines">
        <span>Line {line(claim.from.path)}</span>
        <span>Line {line(claim.to.path)}</span>
      </div>
      <div className="checked-limit__join" aria-hidden="true">
        ↘ ↙
      </div>
      <strong>Shared limit · ε</strong>
      <CopyAddress address={claim.scope} />
      <span>Repeat {claim.period.join(' → ')} forever</span>
      <details>
        <summary>How this connects the lines</summary>
        <p>
          Both recorded trails approach this same infinite address. The checker permits the
          connection between their starting lines. ε marks that shared limit; it is not another copy
          to enter.
        </p>
      </details>
    </div>
  )
}
