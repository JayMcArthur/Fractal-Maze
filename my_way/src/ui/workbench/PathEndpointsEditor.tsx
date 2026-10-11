import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { validatePathMaze } from '../../core/pathMaze/validation'

export function PathEndpointsEditor({
  model,
  onChange,
}: {
  model: PathMazeDefinition
  onChange: (model: PathMazeDefinition) => void
}) {
  return (
    <section className="workbench-card">
      <h2>3. Choose endpoints and movement rules</h2>
      <div className="workbench-toolbar">
        {(['start', 'goal'] as const).map((key) => (
          <label key={key}>
            {key === 'start' ? 'Start path at surface' : 'Finish path at surface'}
            <select
              aria-label={key === 'start' ? 'Start path' : 'Finish path'}
              value={model[key]?.path ?? ''}
              onChange={(event) =>
                onChange({
                  ...model,
                  [key]: event.target.value ? { path: event.target.value, address: [] } : null,
                  alternateGoals: key === 'goal' ? undefined : model.alternateGoals,
                  review: 'wip',
                })
              }
            >
              <option value="">Needs review</option>
              {model.paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label>
          Movement rules
          <select
            aria-label="Movement rules"
            value={model.allowedRule}
            onChange={(event) =>
              onChange({
                ...model,
                type: event.target.value === 'finite' ? 'pathPushdown' : 'infiniteRule',
                allowedRule: event.target.value as PathMazeDefinition['allowedRule'],
                review: 'wip',
              })
            }
          >
            <option value="finite">Finite paths / PDA</option>
            <option value="infiniteHop">Infinite hops (including nested hops)</option>
            <option value="cantorHop">Cantor hops and infinite hops</option>
          </select>
        </label>
      </div>
      <details>
        <summary>Additional surface finishes ({model.alternateGoals?.length ?? 0})</summary>
        <p>Select all valid exit paths when the source permits more than one finish.</p>
        <div className="witness-choices">
          {model.paths
            .filter((path) => path.id !== model.goal?.path)
            .map((path) => (
              <label key={path.id}>
                <input
                  type="checkbox"
                  aria-label={`Additional finish path ${path.label}`}
                  disabled={!model.goal}
                  checked={
                    !!model.alternateGoals?.some(
                      (goal) => goal.path === path.id && !goal.address.length
                    )
                  }
                  onChange={(event) =>
                    onChange({
                      ...model,
                      review: 'wip',
                      alternateGoals: event.target.checked
                        ? [...(model.alternateGoals ?? []), { path: path.id, address: [] }]
                        : model.alternateGoals?.filter(
                            (goal) => goal.path !== path.id || goal.address.length > 0
                          ),
                    })
                  }
                />
                Path {path.label}
              </label>
            ))}
        </div>
      </details>
      {validatePathMaze(model).map((issue, index) => (
        <p className="workbench-help" key={index}>
          {issue.message}
        </p>
      ))}
    </section>
  )
}
