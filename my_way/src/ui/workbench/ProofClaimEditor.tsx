import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { parseCopyWord } from './copyAddress'

export function ProofClaimEditor({
  model,
  claim,
  onChange,
}: {
  model: PathMazeDefinition
  claim: ProofClaim
  onChange: (patch: Partial<ProofClaim>) => void
}) {
  return (
    <section className="workbench-card proof-connection">
      <h2>1. Choose the connection</h2>
      <div className="workbench-toolbar">
        <label className="proof-rule-picker">
          Proof rule
          <select
            aria-label="Proof rule"
            value={claim.rule}
            onChange={(event) =>
              onChange({
                rule: event.target.value as ProofClaim['rule'],
                first: [],
                second: [],
                companions: [],
                setup: undefined,
              })
            }
          >
            <option value="finite">Finite route</option>
            {model.allowedRule !== 'finite' && (
              <option value="connection">Route using checked claims</option>
            )}
            {model.allowedRule !== 'finite' && <option value="infiniteHop">Infinite hop</option>}
            {model.allowedRule === 'cantorHop' && <option value="cantorHop">Cantor hop</option>}
          </select>
        </label>
        {(['from', 'to'] as const).map((key) => (
          <label key={key}>
            {claim.rule === 'infiniteHop'
              ? key === 'from'
                ? 'Left starting line'
                : 'Right starting line'
              : key === 'from'
                ? 'From line'
                : 'To line'}
            <select
              aria-label={`Claim ${key} path`}
              value={claim[key].path}
              onChange={(event) =>
                onChange({
                  [key]: { ...claim[key], path: event.target.value },
                  first: [],
                  second: [],
                })
              }
            >
              {model.paths.map((path) => (
                <option key={path.id} value={path.id}>
                  Line {path.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {claim.rule === 'infiniteHop' && (
        <p className="workbench-help" role="status">
          {claim.period.length
            ? `Repeating copies: ${claim.period.join(' → ')}. Both trails will be checked before this connection can be used.`
            : 'Return both trails to their starting lines inside deeper copies.'}
        </p>
      )}
      <details className="proof-advanced">
        <summary>Advanced · copy addresses</summary>
        <div className="workbench-toolbar">
          {claim.rule === 'infiniteHop' && (
            <label>
              Repeating copies
              <input
                aria-label="Repeating word"
                value={claim.period.join(' ')}
                placeholder="For example: B A C"
                onChange={(event) =>
                  onChange({ period: parseCopyWord(event.target.value, model.copies) })
                }
              />
            </label>
          )}
          {(['from', 'to'] as const).map((key) => (
            <label key={key}>
              {key === 'from' ? 'From copy address' : 'To copy address'}
              <input
                aria-label={`Claim ${key} address`}
                value={claim[key].address.join(' ')}
                placeholder="Empty = surface"
                onChange={(event) =>
                  onChange({
                    [key]: {
                      ...claim[key],
                      address: parseCopyWord(event.target.value, model.copies),
                    },
                    first: [],
                    second: [],
                  })
                }
              />
            </label>
          ))}
          <label>
            Shared starting copy
            <input
              aria-label="Claim scope"
              value={claim.scope.join(' ')}
              placeholder="Empty = surface"
              onChange={(event) =>
                onChange({
                  scope: parseCopyWord(event.target.value, model.copies),
                })
              }
            />
          </label>
        </div>
        <p className="workbench-help">
          Leave addresses empty to start at the surface. The shared starting copy is the prefix of
          the limit address that both trails approach.
        </p>
        {claim.rule === 'infiniteHop' && (
          <label className="proof-setup-toggle">
            <input
              type="checkbox"
              checked={!!claim.setup}
              onChange={(event) =>
                onChange({
                  setup: event.target.checked ? { first: [], second: [] } : undefined,
                  first: [],
                  second: [],
                })
              }
            />
            Build setup trails before the repeating part
          </label>
        )}
      </details>
    </section>
  )
}
