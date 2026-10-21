import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { stateLabel } from '../../core/pathMaze/traversal'
import { SavedProofEvidence } from './SavedProofEvidence'
import { ProvenConnections } from './ProvenConnections'

export function SavedProofClaims({
  model,
  accepted,
  claimsInUse,
  onChange,
}: {
  model: PathMazeDefinition
  accepted: ProofClaim[]
  claimsInUse: boolean
  onChange: (model: PathMazeDefinition) => void
}) {
  return (
    <>
      {accepted.length > 0 && <ProvenConnections claims={accepted} />}
      <section className="proof-saved">
        <h2>Saved claims ({model.claims.length})</h2>
        {claimsInUse && <p>Undo the proof moves in your run before revising saved claims.</p>}

        {model.claims.length === 0 && <p className="workbench-help">No saved proofs yet.</p>}
        {model.claims.map((saved, savedIndex) => (
          <details className="saved-claim" key={saved.id}>
            <summary>
              {accepted.some((lemma) => lemma.id === saved.id) ? 'Checked' : 'Needs revision'} ·{' '}
              {saved.rule} · {stateLabel(saved.from)} {saved.rule === 'finite' ? '→' : '↔'}{' '}
              {stateLabel(saved.to)}
            </summary>
            <SavedProofEvidence
              model={model}
              claim={saved}
              accepted={accepted.filter((lemma) =>
                model.claims.slice(0, savedIndex).some((previous) => previous.id === lemma.id)
              )}
            />
            <button
              className="control"
              disabled={claimsInUse}
              onClick={() => {
                onChange({
                  ...model,
                  claims: model.claims.filter((item) => item.id !== saved.id),
                  draftClaim: saved,
                })
              }}
            >
              Revise claim
            </button>
            <button
              className="control"
              disabled={claimsInUse}
              onClick={() => {
                onChange({ ...model, claims: model.claims.filter((item) => item.id !== saved.id) })
              }}
            >
              Delete claim
            </button>
          </details>
        ))}
      </section>
    </>
  )
}
