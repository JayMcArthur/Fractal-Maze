import { SaveProofReplay } from './SaveProofReplay'
import { ProvenConnections } from './ProvenConnections'
import { SavedProofEvidence } from './SavedProofEvidence'
import { InfiniteConvergence } from './InfiniteConvergence'
import { ProofWitness } from './ProofWitness'
import { inferInfinitePeriod } from '../../core/pathMaze/inferInfinitePeriod'
import { compactBlockArtwork } from '../../core/play/compactBlockArtwork'
import { rulePlayDocument } from '../../app/library/rulePlayDocument'
import { ProofClaimEditor } from './ProofClaimEditor'
import { CantorGroupEditor } from './CantorGroupEditor'
import { useMemo, useState } from 'react'
import type {
  PathMazeDefinition,
  MazeArtwork,
  ProofClaim,
  ProofStep,
} from '../../core/model/pathMaze'
import { checkClaim, checkedClaims, traceWitness } from '../../core/pathMaze/proofs'
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
  inPlay = false,
  claimsInUse = false,
  artwork,
}: {
  artwork?: MazeArtwork
  inPlay?: boolean
  claimsInUse?: boolean
  model: PathMazeDefinition
  document?: RecursiveMazeDocument
  onChange: (model: PathMazeDefinition) => void
}) {
  const [initialClaim] = useState(() => emptyClaim(model))
  const claim = model.draftClaim ?? initialClaim
  const accepted = checkedClaims(model)
  const drawing = useMemo(() => {
    if (artwork) return artwork
    if (!document) return undefined
    const source = (rulePlayDocument(document) ?? document).artwork
    return source && compactBlockArtwork(source, model)
  }, [artwork, document, model])
  const change = (patch: Partial<ProofClaim>) => {
    const next = { ...claim, ...patch }
    const period = inferInfinitePeriod(model, next, accepted)
    onChange({ ...model, draftClaim: period ? { ...next, period } : next })
  }
  const changeSetup = (side: 'first' | 'second', steps: ProofStep[], chooseScope = false) => {
    const setup = {
      first: claim.setup?.first ?? [],
      second: claim.setup?.second ?? [],
      [side]: steps,
    }
    let scope = claim.scope
    if (chooseScope) {
      const anchors = (['first', 'second'] as const).map(
        (key) =>
          traceWitness(
            model,
            key === 'first' ? claim.from : claim.to,
            setup[key],
            claim,
            accepted
          ).states.at(-1)!.address
      )
      scope = []
      for (
        let i = 0;
        i < Math.min(anchors[0].length, anchors[1].length) && anchors[0][i] === anchors[1][i];
        i++
      )
        scope.push(anchors[0][i])
    }
    change({ setup, scope, [side]: [] })
  }
  return (
    <div className="proof-workbench">
      <header className="proof-intro">
        {!inPlay && <h2>Your proof notebook</h2>}
        <p>
          Choose the lines below, then follow the blue paths.
        </p>
        <details className="proof-help">
          <summary>How the proof rules work</summary>
          <p>
            Match the starting lines to the labels on each maze. Blue marks the current line.
            Click a maze to control it with the arrow keys or on-screen arrows. Crossing gates
            records your trail. Repeating copies are detected from the trails you build.
          </p>
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
      <ProofCheckPanel
        model={model}
        claim={claim}
        accepted={accepted}
        document={document}
        onChange={onChange}
      />
      <h2 className="proof-step">
        2. Build {claim.rule === 'infiniteHop' ? 'both trails' : 'the trail'}
      </h2>
      <div
        className={`witness-grid${claim.rule !== 'infiniteHop' && !claim.companions?.length ? ' witness-grid--single' : ''}`}
      >
        <ProofWitness
          artwork={drawing}
          model={model}
          claim={claim}
          accepted={accepted}
          side="first"
          onChange={(steps) => change({ first: steps })}
          onSetupChange={(steps, chooseScope) => changeSetup('first', steps, chooseScope)}
        />
        {claim.rule === 'infiniteHop' && (
          <ProofWitness
            artwork={drawing}
            model={model}
            claim={claim}
            accepted={accepted}
            side="second"
            onChange={(steps) => change({ second: steps })}
            onSetupChange={(steps, chooseScope) => changeSetup('second', steps, chooseScope)}
          />
        )}
        {(claim.companions ?? []).map((pair, index) => (
          <ProofWitness
            key={pair.id}
            artwork={drawing}
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
      {accepted.length > 0 && <ProvenConnections claims={accepted} />}
      <section className="workbench-card">
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
        onClick={() =>
          setChecked({
            claim,
            model,
            result:
              claim.rule === 'infiniteHop' && !claim.period.length
                ? {
                    valid: false,
                    message:
                      'Complete both trails to detect their repeating copies, then check again.',
                    first: [],
                    second: [],
                  }
                : checkClaim(model, claim, accepted),
          })
        }
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
