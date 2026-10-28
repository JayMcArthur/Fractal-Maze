import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { checkProofDraft } from './checkProofDraft'
import { SaveProofReplay } from './SaveProofReplay'

export function ProofCheckPanel({
  model,
  claim,
  checked,
  document,
  inPlay,
  onCheck,
}: {
  model: PathMazeDefinition
  claim: ProofClaim
  checked: ReturnType<typeof checkProofDraft> | null
  document?: RecursiveMazeDocument
  inPlay: boolean
  onCheck: () => void
}) {
  return (
    <section className="workbench-card proof-check" aria-label="Check connection">
      <button className="control control--primary" onClick={onCheck}>
        Check my proof
      </button>
      {checked && (
        <p role="status" className={checked.result.valid ? 'proof-valid' : 'proof-invalid'}>
          {checked.result.valid
            ? inPlay
              ? 'Connection saved. Follow it from the Connections card.'
              : `${checked.result.message} Connection saved.`
            : checked.result.message}
        </p>
      )}
      {!checked && claim.rule === 'infiniteHop' && claim.period.length > 0 && (
        <p role="status">Repeating copies: {claim.period.join(' → ')}.</p>
      )}
      {document && checked && (
        <SaveProofReplay
          document={document}
          model={model}
          claim={checked.claim}
          result={checked.result}
        />
      )}
    </section>
  )
}
