import { useMemo } from 'react'
import type { NativeRoute } from '../../core/replay/nativeReplay'
import type { ReplayDocument } from '../../core/replay/ReplayDocument'
import type { PathMazeDefinition, ProofStep } from '../../core/model/pathMaze'
import type { PathPlayFrame } from '../../core/play/pathSession'
import { stateLabel, reachesGoal, sameState } from '../../core/pathMaze/traversal'
import { pathArrivalPoint } from '../../core/play/pathGeometry'
import { checkedClaims, declaredConnections } from '../../core/pathMaze/proofs'
import { PathMazeDrawing } from '../workbench/PathMazeDrawing'
import { SavedProofEvidence } from '../workbench/SavedProofEvidence'
import { pathMoveDescription } from '../../core/play/pathMovement'

type PathRecording = Extract<NativeRoute, { type: 'pathPushdown' | 'infiniteRule' }>

export function PathReplay({
  doc,
  route,
  step,
  animateStep,
  speed,
  onSourceMotion,
  motionPaused,
}: {
  doc: ReplayDocument
  route: PathRecording
  step: number
  animateStep: boolean
  speed: number
  onSourceMotion: (moving: boolean) => void
  motionPaused: boolean
}) {
  const arrivalEdges = useMemo(
    () => (step && !route.physical ? [route.edges[step - 1]] : undefined),
    [route, step]
  )
  const frame = useMemo<PathPlayFrame | undefined>(() => {
    if (!route.physical) return undefined
    return {
      position: route.physical.positions[step],
      ...(step
        ? { from: route.physical.positions[step - 1], move: route.physical.moves[step - 1] }
        : {}),
    }
  }, [route, step])
  const model = doc.maze.definition as PathMazeDefinition
  const artwork = doc.playArtwork ?? doc.maze.artwork
  const drawingFrame = useMemo<PathPlayFrame | undefined>(() => {
    if (animateStep) return frame
    if (frame) return { position: frame.position }
    const state = route.states[step]
    if (!artwork?.traces.some(trace => trace.path === state.path)) return undefined
    const finish = artwork.finishes?.find(finish => sameState(finish.state, state))?.point ?? artwork.goal
    const point = reachesGoal(model, state) && finish ? finish
      : pathArrivalPoint(artwork, model, state, step ? route.edges[step - 1] : undefined)
    return { position: { state, point } }
  }, [frame, animateStep, artwork, model, route, step])
  return (
    <div className="path-replay">
      <p className="format-status">
        {stateLabel(frame?.position.state ?? route.states[step], model)}
      </p>
      <PathMazeDrawing
        model={doc.maze.definition as PathMazeDefinition}
        artwork={artwork}
        current={frame?.position.state ?? route.states[step]}
        frame={drawingFrame}
        arrivalEdges={arrivalEdges}
        animationMs={500 / speed}
        onMotionChange={onSourceMotion}
        motionPaused={motionPaused}
      />
      <PathReplayEvidence model={model} route={route} frame={frame} step={step} />
    </div>
  )
}

function PathReplayEvidence({
  model,
  route,
  frame,
  step,
}: {
  model: PathMazeDefinition
  route: PathRecording
  frame?: PathPlayFrame
  step: number
}) {
  if (!step) return null
  const move = frame?.move
  if (move?.kind === 'walk') return <p>Walk along the path</p>
  const proofStep =
    move?.kind === 'lemma' ? move.step : frame ? undefined : route.proofSteps?.[step - 1]
  const proof = checkedReplayProof(model, proofStep)
  const used = proof?.claim
  const from = frame ? frame.from!.state : route.states[step - 1]
  const reference = move?.kind === 'cross' ? move.route.edges[0] : route.edges[step - 1]
  let label = proofStep?.reference ?? reference
  if (used) {
    const to = frame ? frame.position.state : route.states[step]
    label = `path ${model.paths.find((path) => path.id === from.path)!.label} → path ${model.paths.find((path) => path.id === to.path)!.label}`
  } else if (proofStep?.kind !== 'lemma') label = ordinaryMoveLabel(model, from, reference)
  return (
    <>
      <p>
        {used ? 'Use checked connection' : 'Ordinary move'} · <code>{label}</code>
      </p>
      {used && (
        <details className="replay-proof" open>
          <summary>Proof for this connection</summary>
          <SavedProofEvidence
            model={model}
            claim={used}
            accepted={proof!.accepted}
          />
        </details>
      )}
    </>
  )
}

function checkedReplayProof(model: PathMazeDefinition, step: ProofStep | undefined) {
  if (step?.kind !== 'lemma') return null
  const claims = checkedClaims(model)
  const index = claims.findIndex(claim => declaredConnections(claim).some(pair => pair.id === step.reference))
  return index < 0 ? null : { claim: claims[index], accepted: claims.slice(0, index) }
}

function ordinaryMoveLabel(model: PathMazeDefinition, from: PathPlayFrame['position']['state'], reference: string) {
  const edge = model.connections.find(edge => edge.id === reference)!
  const { action, path } = pathMoveDescription(model, from, edge)
  return action === 'Finish' ? 'Finish maze' : `${action} → path ${path}`
}
