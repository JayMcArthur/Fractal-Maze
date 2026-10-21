import { ProofCheckPanel } from './ProofCheckPanel'
import { SavedProofClaims } from './SavedProofClaims'
import { InfiniteConvergence } from './InfiniteConvergence'
import { ProofWitness } from './ProofWitness'
import { inferInfinitePeriod } from '../../core/pathMaze/inferInfinitePeriod'
import { compactBlockArtwork } from '../../core/play/compactBlockArtwork'
import { rulePlayDocument } from '../../app/library/rulePlayDocument'
import { ProofClaimEditor, ProofOptions } from './ProofClaimEditor'
import { CantorGroupEditor } from './CantorGroupEditor'
import { useMemo, useState } from 'react'
import type {
  PathMazeDefinition,
  MazeArtwork,
  ProofClaim,
  ProofStep,
} from '../../core/model/pathMaze'
import { checkedClaims, traceWitness } from '../../core/pathMaze/proofs'
import type { ProofCheck } from '../../core/pathMaze/proofs'
import { checkProofDraft } from './checkProofDraft'
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
  const draft = model.draftClaim
  const claim =
    draft && (!inPlay || draft.rule === 'infiniteHop' || draft.rule === 'cantorHop')
      ? draft
      : initialClaim
  const [checked, setChecked] = useState<{ claim: ProofClaim; result: ProofCheck } | null>(null)
  const accepted = checkedClaims(model)
  const drawing = useMemo(() => {
    if (artwork) return artwork
    if (!document) return undefined
    const source = (rulePlayDocument(document) ?? document).artwork
    return source && compactBlockArtwork(source, model)
  }, [artwork, document, model])
  const change = (patch: Partial<ProofClaim>) => {
    setChecked(null)
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
      {!inPlay && <h2>Your proof notebook</h2>}
      <p className="proof-instruction">
        {claim.rule === 'infiniteHop'
          ? 'Use arrows or click gates to follow each blue line into deeper copies. Both trails must repeat.'
          : claim.rule === 'cantorHop'
            ? 'Connect the two lines, using the hypothesis only inside deeper copies.'
            : 'Build a route between these lines.'}
      </p>
      <ProofClaimEditor model={model} claim={claim} onChange={change} />
      {claim.rule === 'cantorHop' && (
        <details className="workbench-card" open={(claim.companions?.length ?? 0) > 0}>
          <summary>Related connections · optional</summary>
          <CantorGroupEditor model={model} claim={claim} onChange={change} />
        </details>
      )}
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
      <ProofCheckPanel
        model={model}
        claim={claim}
        checked={checked}
        document={document}
        inPlay={inPlay}
        onCheck={() => {
          const next = checkProofDraft(model, claim, accepted)
          setChecked(next)
          if (next.result.valid)
            onChange({
              ...model,
              claims: [...model.claims, next.claim],
              draftClaim: emptyClaim(model),
            })
        }}
      />
      <ProofOptions model={model} claim={claim} onChange={change} inPlay={inPlay}>
        {claim.rule === 'infiniteHop' && claim.period.length > 0 && (
          <InfiniteConvergence model={model} claim={claim} accepted={accepted} />
        )}
      </ProofOptions>
      <SavedProofClaims
        model={model}
        accepted={accepted}
        claimsInUse={claimsInUse}
        onChange={(next) => {
          setChecked(null)
          onChange(next)
        }}
      />
    </div>
  )
}
