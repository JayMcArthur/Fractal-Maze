import type { PathMazeDefinition, ProofClaim } from '../../core/model/pathMaze'
import { parseCopyWord } from './copyAddress'

export function CantorGroupEditor({
  model,
  claim,
  onChange,
}: {
  model: PathMazeDefinition
  claim: ProofClaim
  onChange: (patch: Partial<ProofClaim>) => void
}) {
  return (
    <section className="workbench-card cantor-group">
      <h2>Joint Cantor hypotheses</h2>
      <p>
        If several connections rely on one another, declare them together. Each connection needs a
        finite witness; every hypothesis use must occur inside a nonempty descendant copy.
      </p>
      {(claim.companions ?? []).map((pair, index) => (
        <div className="companion-row" key={pair.id}>
          <strong>Connection {index + 2}</strong>
          {(['from', 'to'] as const).map((key) => (
            <label key={key}>
              {key} path
              <select
                aria-label={`Related ${index + 2} ${key} path`}
                value={pair[key].path}
                onChange={(event) =>
                  onChange({
                    companions: claim.companions!.map((item) =>
                      item.id === pair.id
                        ? {
                            ...item,
                            [key]: { ...item[key], path: event.target.value },
                            witness: [],
                          }
                        : item
                    ),
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
          {(['from', 'to'] as const).map((key) => (
            <label key={key}>
              {key} copy address
              <input
                aria-label={`Related ${index + 2} ${key} address`}
                value={pair[key].address.join(' ')}
                placeholder="Empty = surface"
                onChange={(event) =>
                  onChange({
                    companions: claim.companions!.map((item) =>
                      item.id === pair.id
                        ? {
                            ...item,
                            [key]: {
                              ...item[key],
                              address: parseCopyWord(event.target.value, model.copies),
                            },
                            witness: [],
                          }
                        : item
                    ),
                  })
                }
              />
            </label>
          ))}
          <button
            className="control"
            onClick={() =>
              onChange({ companions: claim.companions!.filter((item) => item.id !== pair.id) })
            }
          >
            Remove related connection
          </button>
        </div>
      ))}
      <button
        className="control"
        onClick={() =>
          onChange({
            companions: [
              ...(claim.companions ?? []),
              {
                id: crypto.randomUUID(),
                from: { path: model.paths[1]?.id ?? '', address: [...claim.scope] },
                to: { ...claim.to },
                witness: [],
              },
            ],
          })
        }
      >
        Add related connection
      </button>
    </section>
  )
}
