import type { PathMazeDefinition, PathState, ProofStep } from '../../core/model/pathMaze'
import { stateLabel } from '../../core/pathMaze/traversal'

export function WitnessRoute({
  model,
  states,
  steps,
  error,
}: {
  model: PathMazeDefinition
  states: PathState[]
  steps: ProofStep[]
  error: string | null
}) {
  const describe = (step: ProofStep) => {
    if (step.kind === 'hypothesis') return 'Descendant hypothesis'
    if (step.kind === 'lemma') return 'Checked lemma'
    const edge = model.connections.find((edge) => edge.id === step.reference)
    if (!edge) return 'Missing connection'
    return edge.operation === 'walk'
      ? 'Walk'
      : `${edge.operation === 'enter' ? 'Enter' : 'Exit'} ${edge.copy}`
  }
  return (
    <>
      <ol className="witness-steps">
        {states.map((state, index) => (
          <li key={index}>
            <code>
              {stateLabel({
                ...state,
                path: model.paths.find((path) => path.id === state.path)?.label ?? state.path,
              })}
            </code>
            {index > 0 && <span>{describe(steps[index - 1])}</span>}
          </li>
        ))}
      </ol>
      {error && <p className="proof-invalid">{error}</p>}
    </>
  )
}
