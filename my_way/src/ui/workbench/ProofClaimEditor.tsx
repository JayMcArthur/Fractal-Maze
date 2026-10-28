import type { ReactNode } from 'react'
import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { selectProofStart } from './selectProofStart'
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
    <section className="proof-connection" aria-label="Connection endpoints">
      <div className="workbench-toolbar">
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
                onChange(selectProofStart(claim, key, { ...claim[key], path: event.target.value }))
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
    </section>
  )
}

export function ProofOptions({
  model,
  claim,
  onChange,
  inPlay,
  children,
}: {
  model: PathMazeDefinition
  claim: ProofClaim
  onChange: (patch: Partial<ProofClaim>) => void
  inPlay: boolean
  children?: ReactNode
}) {
  return (
    <details className="proof-advanced">
      <summary>Proof options and help</summary>
      {(!inPlay || model.allowedRule === 'cantorHop') && (
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
                period: [],
              })
            }
          >
            {model.allowedRule === 'finite' && <option value="finite">Finite route</option>}
            {!inPlay && model.allowedRule !== 'finite' && (
              <option value="connection">Route using checked claims (authoring)</option>
            )}
            {model.allowedRule !== 'finite' && <option value="infiniteHop">Infinite hop</option>}
            {model.allowedRule === 'cantorHop' && <option value="cantorHop">Cantor hop</option>}
          </select>
        </label>
      )}
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
                onChange(
                  selectProofStart(claim, key, {
                    ...claim[key],
                    address: parseCopyWord(event.target.value, model.copies),
                  })
                )
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
        Leave addresses empty to start at the surface. The shared starting copy is the prefix of the
        limit address that both trails approach.
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
      {children}
      <p className="workbench-help">
        Blue marks the current line. Use the arrows or click a gate to cross into another copy.
        Infinite hops need two trails repeating toward the same limit. Cantor hops may use their
        connection hypothesis only inside a strictly deeper copy.
      </p>
      <a
        href="https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/"
        target="_blank"
        rel="noreferrer"
      >
        Read Siggy’s movement rules ↗
      </a>
    </details>
  )
}
