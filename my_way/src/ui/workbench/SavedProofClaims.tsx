import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { declaredConnections } from '../../core/pathMaze/proofs'
import type { availableProofMoves, CheckedProofStep } from '../../core/play/proofMovement'
import { SavedProofEvidence } from './SavedProofEvidence'
import { CheckedLimit } from './CheckedLimit'

export function SavedProofClaims({
  model,
  accepted,
  claimsInUse,
  onChange,
  moves = [],
  onFollow,
}: {
  model: PathMazeDefinition
  accepted: ProofClaim[]
  claimsInUse: boolean
  onChange: (model: PathMazeDefinition) => void
  moves?: ReturnType<typeof availableProofMoves>
  onFollow?: (step: CheckedProofStep) => void
}) {
  const line = (path: string) => model.paths.find((item) => item.id === path)?.label ?? path
  return (
    <aside className="proof-saved" aria-label="Saved connections">
      <h2>Connections ({model.claims.length})</h2>
      {claimsInUse && (
        <p className="workbench-help">Undo proof moves before revising their evidence.</p>
      )}
      {!model.claims.length && (
        <p className="workbench-help">
          Checked routes appear here. Name a connection and follow it from the maze.
        </p>
      )}
      {model.claims.map((saved, index) => {
        const valid = accepted.some((item) => item.id === saved.id)
        const connections = declaredConnections(saved)
        const legal = moves.filter((item) =>
          connections.some((pair) => pair.id === item.move.step.reference)
        )
        return (
          <article
            className="saved-claim"
            key={saved.id}
            aria-label={
              saved.name ?? `Line ${line(saved.from.path)} to Line ${line(saved.to.path)}`
            }
          >
            <span className={valid ? 'proof-valid' : 'proof-invalid'}>
              {valid ? 'Checked' : 'Needs revision'} ·{' '}
              {saved.rule === 'infiniteHop'
                ? 'Infinite hop'
                : saved.rule === 'cantorHop'
                  ? 'Cantor hop'
                  : 'Route'}
            </span>
            <label>
              Connection name
              <input
                aria-label={`Connection ${index + 1} name`}
                maxLength={80}
                defaultValue={
                  saved.name ?? `Line ${line(saved.from.path)} ↔ Line ${line(saved.to.path)}`
                }
                onBlur={(event) => {
                  const name = event.target.value.trim() || undefined
                  if (name !== saved.name)
                    onChange({
                      ...model,
                      claims: model.claims.map((item) =>
                        item.id === saved.id ? { ...item, name } : item
                      ),
                    })
                }}
              />
            </label>
            {valid && <CheckedLimit model={model} claim={saved} />}
            {onFollow && (
              <div className="saved-claim__follow">
                {legal.length ? (
                  legal.map(({ move, position }) => (
                    <button
                      className="control control--primary"
                      key={`${move.step.reference}:${move.step.reverse}`}
                      onClick={() => onFollow(move.step)}
                    >
                      Follow → Line {line(position.state.path)}
                    </button>
                  ))
                ) : (
                  <p className="workbench-help">
                    {valid
                      ? 'Walk to a connected line in Play to follow this route.'
                      : 'Revise and check before following.'}
                  </p>
                )}
              </div>
            )}
            <details>
              <summary>Evidence and editing</summary>
              <SavedProofEvidence
                model={model}
                claim={saved}
                accepted={accepted.filter((item) =>
                  model.claims.slice(0, index).some((previous) => previous.id === item.id)
                )}
              />
              <div className="button-row">
                <button
                  className="control"
                  disabled={claimsInUse}
                  onClick={() =>
                    onChange({
                      ...model,
                      claims: model.claims.filter((item) => item.id !== saved.id),
                      draftClaim: saved,
                    })
                  }
                >
                  Revise claim
                </button>
                <button
                  className="control"
                  disabled={claimsInUse}
                  onClick={() =>
                    onChange({
                      ...model,
                      claims: model.claims.filter((item) => item.id !== saved.id),
                    })
                  }
                >
                  Delete claim
                </button>
              </div>
            </details>
          </article>
        )
      })}
    </aside>
  )
}
