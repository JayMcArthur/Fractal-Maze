import { SaveProofReplay } from './SaveProofReplay'
import { ProvenConnections } from './ProvenConnections'
import { SavedProofEvidence } from './SavedProofEvidence'
import { InfiniteConvergence } from './InfiniteConvergence'
import { WitnessRoute } from './WitnessRoute'
import { ProofClaimEditor } from './ProofClaimEditor'
import { CantorGroupEditor } from './CantorGroupEditor'
import { useState } from 'react'
import type {
  PathMazeDefinition,
  PathState,
  ProofClaim,
  ProofStep,
} from '../../core/model/pathMaze'
import {
  applyProofStep,
  checkClaim,
  checkedClaims,
  declaredConnections,
  traceWitness,
  infiniteWitness,
} from '../../core/pathMaze/proofs'
import type { ProofCheck } from '../../core/pathMaze/proofs'
import { stateLabel } from '../../core/pathMaze/traversal'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'

const emptyClaim = (model: PathMazeDefinition): ProofClaim => ({
  id: crypto.randomUUID(),
  rule: model.allowedRule === 'finite' ? 'finite' : model.allowedRule,
  from: model.start ?? { path: model.paths[0]?.id ?? '', address: [] },
  to: model.goal ?? { path: model.paths.at(-1)?.id ?? '', address: [] },
  scope: [],
  period: [],
  first: [],
  second: [],
})

export function ProofWorkbench({
  model,
  document,
  onChange,
}: {
  model: PathMazeDefinition
  document?: RecursiveMazeDocument
  onChange: (model: PathMazeDefinition) => void
}) {
  const [initialClaim] = useState(() => emptyClaim(model))
  const claim = model.draftClaim ?? initialClaim
  const accepted = checkedClaims(model)
  const change = (patch: Partial<ProofClaim>) => {
    const next = { ...claim, ...patch }
    onChange({ ...model, draftClaim: next })
  }
  return (
    <div className="proof-workbench">
      <header className="proof-intro">
        <h2>Your proof notebook</h2>
        <p>Choose the lines to connect, build the trails, then check your proof.</p>
        <details className="proof-help">
          <summary>How the proof rules work</summary>
          <p>
            A finite route uses ordinary moves. For an infinite hop, both trails must repeat toward
            the same limit. A Cantor hop may use its connection hypothesis only inside a strictly
            deeper copy. Checking a proof validates the selected movement rule.
          </p>
          <a
            href="https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/"
            target="_blank"
            rel="noreferrer"
          >
            Read Siggy’s movement rules ↗
          </a>
        </details>
      </header>
      <ProofClaimEditor model={model} claim={claim} onChange={change} />
      {claim.rule === 'cantorHop' && (
        <details className="workbench-card" open={(claim.companions?.length ?? 0) > 0}>
          <summary>Related connections · optional</summary>
          <CantorGroupEditor model={model} claim={claim} onChange={change} />
        </details>
      )}
      <h2 className="proof-step">
        2. Build {claim.rule === 'infiniteHop' ? 'both trails' : 'the trail'}
      </h2>
      <div
        className={`witness-grid${claim.rule !== 'infiniteHop' && !claim.companions?.length ? ' witness-grid--single' : ''}`}
      >
        <Witness
          model={model}
          claim={claim}
          accepted={accepted}
          side="first"
          onChange={(steps) => change({ first: steps })}
          onSetupChange={(steps) =>
            change({
              setup: { first: steps, second: claim.setup?.second ?? [] },
              first: [],
            })
          }
        />
        {claim.rule === 'infiniteHop' && (
          <Witness
            model={model}
            claim={claim}
            accepted={accepted}
            side="second"
            onChange={(steps) => change({ second: steps })}
            onSetupChange={(steps) =>
              change({
                setup: { first: claim.setup?.first ?? [], second: steps },
                second: [],
              })
            }
          />
        )}
        {(claim.companions ?? []).map((pair, index) => (
          <Witness
            key={pair.id}
            model={model}
            claim={claim}
            accepted={accepted}
            side={index}
            onChange={(steps) =>
              change({
                companions: claim.companions!.map((item) =>
                  item.id === pair.id ? { ...item, witness: steps } : item
                ),
              })
            }
          />
        ))}
      </div>
      {claim.rule === 'infiniteHop' && (
        <InfiniteConvergence model={model} claim={claim} accepted={accepted} />
      )}
      <ProofCheckPanel
        model={model}
        claim={claim}
        accepted={accepted}
        document={document}
        onChange={onChange}
      />
      {accepted.length > 0 && <ProvenConnections claims={accepted} />}
      <section className="workbench-card">
        <h2>Saved claims ({model.claims.length})</h2>

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
              onClick={() =>
                onChange({ ...model, claims: model.claims.filter((item) => item.id !== saved.id) })
              }
            >
              Delete claim
            </button>
          </details>
        ))}
      </section>
    </div>
  )
}

function ProofCheckPanel({
  model,
  claim,
  accepted,
  document,
  onChange,
}: {
  model: PathMazeDefinition
  claim: ProofClaim
  accepted: ProofClaim[]
  document?: RecursiveMazeDocument
  onChange: (model: PathMazeDefinition) => void
}) {
  const [checked, setChecked] = useState<{
    claim: ProofClaim
    model: PathMazeDefinition
    result: ProofCheck
  } | null>(null)
  const result = checked?.claim === claim && checked.model === model ? checked.result : null
  return (
    <section className="workbench-card proof-check">
      <button
        className="control control--primary"
        onClick={() => setChecked({ claim, model, result: checkClaim(model, claim, accepted) })}
      >
        Check my proof
      </button>
      {result && (
        <p role="status" className={result.valid ? 'proof-valid' : 'proof-invalid'}>
          {result.message}
        </p>
      )}
      {result?.valid && (
        <button
          className="control"
          onClick={() => {
            const next = emptyClaim(model)
            onChange({ ...model, claims: [...model.claims, claim], draftClaim: next })
            setChecked(null)
          }}
        >
          Save checked claim
        </button>
      )}
      {document && (
        <SaveProofReplay document={document} model={model} claim={claim} result={result} />
      )}
    </section>
  )
}

function Witness({
  model,
  claim,
  accepted,
  side,
  onChange,
  phase = 'cycle',
  onSetupChange,
}: {
  model: PathMazeDefinition
  claim: ProofClaim
  accepted: ProofClaim[]
  side: 'first' | 'second' | number
  onChange: (steps: ProofStep[]) => void
  phase?: 'setup' | 'cycle'
  onSetupChange?: (steps: ProofStep[]) => void
}) {
  const { start, steps, target, infinite } = witnessData(model, claim, accepted, side, phase)
  const traced = traceWitness(model, start, steps, claim, accepted)
  const current = traced.states.at(-1)!
  const choices = witnessChoices(model, claim, accepted, current)
  return (
    <section className={phase === 'setup' ? 'witness-setup' : 'workbench-card witness'}>
      <h2>
        {phase === 'setup'
          ? 'Setup trail'
          : typeof side === 'number'
            ? `Witness for connection ${side + 2}`
            : side === 'first'
              ? claim.rule === 'infiniteHop'
                ? 'Left trail'
                : 'Trail'
              : 'Right trail'}
      </h2>
      {phase === 'cycle' && infinite && claim.setup && onSetupChange && (
        <Witness
          model={model}
          claim={claim}
          accepted={accepted}
          side={side}
          phase="setup"
          onChange={onSetupChange}
        />
      )}
      <p className="witness-goal">
        {phase === 'setup'
          ? 'Move to the copy where repetition begins.'
          : `${infinite ? 'Repeat to' : 'Reach'} ${stateLabel(target)}`}
      </p>
      <div className="witness-current">
        <span>Now</span>
        <strong>{stateLabel(current)}</strong>
      </div>
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
      <div className="witness-choices">
        {choices.map((choice, index) => (
          <button
            className="control"
            key={index}
            disabled={!!traced.error}
            onClick={() => onChange([...steps, choice.step])}
          >
            {choice.label}
          </button>
        ))}
      </div>
      {!choices.length && (
        <p className="workbench-help">
          No legal step at this address. Review the connections or undo a step.
        </p>
      )}
      <div className="button-row">
        <button
          className="control"
          disabled={!steps.length}
          onClick={() => onChange(steps.slice(0, -1))}
        >
          Undo witness step
        </button>
        <button className="control" disabled={!steps.length} onClick={() => onChange([])}>
          Clear witness
        </button>
      </div>
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
  const companion = typeof side === 'number' ? claim.companions![side] : null
  const infinite =
    !companion && claim.rule === 'infiniteHop'
      ? infiniteWitness(model, claim, accepted, side as 'first' | 'second')
      : null
  const start =
    phase === 'cycle' && infinite
      ? infinite.anchor
      : companion
        ? companion.from
        : side === 'first'
          ? claim.from
          : claim.to
  const steps =
    phase === 'setup'
      ? claim.setup![side as 'first' | 'second']
      : companion
        ? companion.witness
        : claim[side as 'first' | 'second']
  const target = companion ? companion.to : infinite ? infinite.target : claim.to
  return { start, steps, target, infinite }
}
