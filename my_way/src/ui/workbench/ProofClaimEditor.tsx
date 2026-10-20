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
    <section className="workbench-card">
      <h2>1. Choose the connection</h2>
      <div className="workbench-toolbar">
        <label>
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
                  {path.label}
                </option>
              ))}
            </select>
          </label>
        ))}
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
      </div>
      <details className="proof-advanced">
        <summary>Advanced · copy addresses and shared starting copy</summary>
        <div className="workbench-toolbar">
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
      </details>
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
    </section>
  )
}
