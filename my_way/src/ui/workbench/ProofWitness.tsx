import type {
  MazeArtwork,
  PathMazeDefinition,
  PathState,
  ProofClaim,
  ProofStep,
} from '../../core/model/pathMaze'
import {
  applyProofStep,
  declaredConnections,
  infiniteWitness,
  traceWitness,
} from '../../core/pathMaze/proofs'
import { stateLabel } from '../../core/pathMaze/traversal'
import { WitnessRoute } from './WitnessRoute'
import { WitnessMaze } from './WitnessMaze'

export function ProofWitness({
  model,
  claim,
  accepted,
  side,
  onChange,
  phase = 'cycle',
  onSetupChange,
  artwork,
}: {
  artwork?: MazeArtwork
  model: PathMazeDefinition
  claim: ProofClaim
  accepted: ProofClaim[]
  side: 'first' | 'second' | number
  onChange: (steps: ProofStep[]) => void
  phase?: 'setup' | 'cycle'
  onSetupChange?: (steps: ProofStep[], chooseScope?: boolean) => void
}) {
  const { start, steps, infinite, heading, goal } = witnessData(model, claim, accepted, side, phase)
  const traced = traceWitness(model, start, steps, claim, accepted)
  const current = traced.states.at(-1)!
  const choices = witnessChoices(model, claim, accepted, current)
  const drawing =
    artwork &&
    [start, current].every((state) => artwork.traces.some((trace) => trace.path === state.path))
      ? artwork
      : undefined
  const choiceButton = (choice: (typeof choices)[number]) => (
    <button
      className="control"
      key={`${choice.step.kind}:${choice.step.reference}:${choice.step.reverse}`}
      disabled={!!traced.error}
      onClick={() => onChange([...steps, choice.step])}
    >
      {choice.label}
    </button>
  )
  const proofControls = choices.filter((choice) => choice.step.kind !== 'edge').map(choiceButton)
  const board = phase === 'cycle' && drawing
  return (
    <section
      className={phase === 'setup' ? 'witness-setup' : 'workbench-card witness'}
      aria-label={heading}
    >
      <div className="witness-heading">
        <h2>{heading}</h2>
        <div className="button-row">
          <button
            className="control"
            aria-label="Undo witness step"
            disabled={!steps.length}
            onClick={() => onChange(steps.slice(0, -1))}
          >
            Undo
          </button>
          <button
            className="control"
            aria-label="Clear witness"
            disabled={!steps.length}
            onClick={() => onChange([])}
          >
            Clear
          </button>
        </div>
      </div>
      <p className="witness-goal">{goal}</p>
      {infinite && claim.setup && onSetupChange && (
        <ProofWitness
          artwork={artwork}
          model={model}
          claim={claim}
          accepted={accepted}
          side={side}
          phase="setup"
          onChange={onSetupChange}
        />
      )}
      {board ? (
        <WitnessMaze
          model={model}
          artwork={board}
          controls={proofControls}
          start={start}
          current={current}
          steps={steps}
          onChange={onChange}
        />
      ) : (
        proofControls
      )}
      {!board && (
        <div className="witness-current">
          <span>Now</span>
          <strong>{stateLabel(current)}</strong>
        </div>
      )}
      {traced.error && (
        <p className="proof-invalid" role="alert">
          {traced.error}
        </p>
      )}
      {steps.length > 0 && (
        <details className="witness-history">
          <summary>
            Trail history · {steps.length} {steps.length === 1 ? 'step' : 'steps'}
          </summary>
          <WitnessRoute model={model} states={traced.states} steps={steps} error={null} />
        </details>
      )}
      <details className="witness-text-steps" open={!drawing || phase === 'setup'}>
        <summary>Advanced · choose a connection by name</summary>
        {infinite && onSetupChange && typeof side !== 'number' && (
          <button
            className="control"
            disabled={!steps.length}
            onClick={() => onSetupChange([...(claim.setup?.[side] ?? []), ...steps], true)}
          >
            Start repetition here
          </button>
        )}
        <div className="witness-choices">
          {choices.filter((choice) => choice.step.kind === 'edge').map(choiceButton)}
        </div>
      </details>
      {!choices.length && (
        <p className="workbench-help">
          No legal step at this address. Review the connections or undo a step.
        </p>
      )}
    </section>
  )
}

function witnessChoices(
  model: PathMazeDefinition,
  claim: ProofClaim,
  accepted: ProofClaim[],
  current: PathState
) {
  const choices: { step: ProofStep; label: string; next: PathState }[] = []
  const add = (step: ProofStep, label: string) => {
    const next = applyProofStep(
      model,
      current,
      step,
      claim,
      claim.rule === 'finite' ? accepted.filter((lemma) => lemma.rule === 'finite') : accepted
    )
    if (next) choices.push({ step, label, next })
  }
  model.connections.forEach((edge) =>
    add(
      { kind: 'edge', reference: edge.id, reverse: false },
      `${edge.operation} ${edge.copy} → ${model.paths.find((path) => path.id === edge.to)?.label}`
    )
  )
  accepted.forEach((lemma, index) =>
    declaredConnections(lemma).forEach((pair, connection) =>
      [false, true].forEach((reverse) =>
        add(
          { kind: 'lemma', reference: pair.id, reverse },
          `Use checked claim ${index + 1}${connection ? ` connection ${connection + 1}` : ''}${reverse ? ' backwards' : ''}`
        )
      )
    )
  )
  if (claim.rule === 'cantorHop')
    declaredConnections(claim).forEach((pair, index) =>
      [false, true].forEach((reverse) =>
        add(
          { kind: 'hypothesis', reference: pair.id, reverse },
          `Use descendant hypothesis${index ? ` ${index + 1}` : ''}${reverse ? ' backwards' : ''}`
        )
      )
    )
  return choices
}

function witnessData(
  model: PathMazeDefinition,
  claim: ProofClaim,
  accepted: ProofClaim[],
  side: 'first' | 'second' | number,
  phase: 'setup' | 'cycle'
) {
  if (typeof side === 'number') {
    const pair = claim.companions![side]
    return {
      start: pair.from,
      steps: pair.witness,
      infinite: null,
      heading: `Related trail ${side + 2}`,
      goal: `Reach ${stateLabel(pair.to)}`,
    }
  }
  const origin = side === 'first' ? claim.from : claim.to
  if (phase === 'setup')
    return {
      start: origin,
      steps: claim.setup![side],
      infinite: null,
      heading: 'Setup trail',
      goal: 'Move to the copy where repetition begins.',
    }
  if (claim.rule !== 'infiniteHop')
    return {
      start: origin,
      steps: claim[side],
      infinite: null,
      heading: 'Trail',
      goal: `Reach ${stateLabel(claim.to)}`,
    }
  const infinite = infiniteWitness(model, claim, accepted, side)
  const goal = claim.period.length
    ? `Repeat to ${stateLabel(infinite.target)}`
    : `Return to Line ${model.paths.find((path) => path.id === infinite.anchor.path)?.label} inside a deeper copy.`
  return {
    start: infinite.anchor,
    steps: claim[side],
    infinite,
    heading: side === 'first' ? 'Left trail' : 'Right trail',
    goal,
  }
}
