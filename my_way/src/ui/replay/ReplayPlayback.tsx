import type { PlayerPosition } from '../../core/model/playerState'
import { BlockReplay } from './BlockReplay'
import { PathReplay } from './PathReplay'
import { TourRenderer } from '../../core/render/svg/TourRenderer'
import type { RecursiveTourDefinition } from '../../core/model/recursiveTour'
import { replayStepCount } from '../../core/replay/nativeReplay'
import { RepeatedReplay } from './RepeatedReplay'
import type { RepeatedDirectedDefinition } from '../../core/model/repeatedDirected'
import { useEffect, useMemo, useState } from 'react'
import { useReplayStore } from '../../app/store/replaySlice'
import { downloadFile } from '../../core/io/downloadFile'
import { MazeCanvas } from '../components/MazeCanvas'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import type { ReplayDocument } from '../../core/replay/ReplayDocument'
import { GraphLabeledRenderer } from '../../core/render/svg/GraphLabeledRenderer'
import { sessionPathRoute, pathRouteSession } from '../../core/play/pathSession'
import { portReplaySession } from '../../core/replay/portReplaySession'
import { portPlayDocument } from '../../app/library/portPlayDocument'
import { geometricPlayDocument } from '../../app/library/geometricPlayDocument'
import { geometricReplaySession } from '../../core/replay/geometricReplaySession'
import { rulePlayDocument } from '../../app/library/rulePlayDocument'

export function ReplayPlayback({ doc: original }: { doc: ReplayDocument }) {
  const doc = useMemo(() => {
    const route = original.nativeRoute
    if (route && (route.type === 'pathPushdown' || route.type === 'infiniteRule') && !original.playArtwork) {
      const maze = rulePlayDocument(original.maze)
      if (maze) return { ...original, maze }
    }
    if (route?.type === 'geometricRecursive' && original.maze.definition.type === 'geometricRecursive') {
      const maze = geometricPlayDocument(original.maze)!
      const model = maze.definition as PathMazeDefinition
      const physical = geometricReplaySession(original.maze.definition.maze, model, maze.artwork!, route)
      return { ...original, maze,
        nativeRoute: { type: 'pathPushdown' as const, ...sessionPathRoute(physical), physical } }
    }
    if (route && (route.type === 'pathPushdown' || route.type === 'infiniteRule') &&
      route.proofSteps && !route.physical && original.maze.artwork?.traces.length) {
      const model = original.maze.definition as PathMazeDefinition
      const physical = pathRouteSession(model, original.playArtwork ?? original.maze.artwork, route)
      return { ...original, nativeRoute: { ...route, physical },
        metrics: { ...original.metrics, totalMoves: physical.moves.length } }
    }
    if (original.nativeRoute?.type !== 'recursivePorts' || original.maze.definition.type !== 'recursivePorts')
      return original
    const maze = portPlayDocument(original.maze)!
    const model = maze.definition as PathMazeDefinition
    const physical = portReplaySession(original.maze.definition, model, maze.artwork!, original.nativeRoute.states)
    return { ...original, maze,
      nativeRoute: { type: 'pathPushdown' as const, ...sessionPathRoute(physical), physical } }
  }, [original])
  const [sourceMoving, setSourceMoving] = useState(false)
  const [motionPaused, setMotionPaused] = useState(false)
  const {
    doc: loadedDoc,
    currentStep,
    animateStep,
    isPlaying,
    speed,
    currentPosition,
    trail,
    loadReplay,
    play,
    pause,
    stepForward,
    stepBack,
    seekTo,
    setSpeed,
  } = useReplayStore()
  useEffect(() => {
    loadReplay(doc)
    return pause
  }, [doc, loadReplay, pause])
  useEffect(() => {
    if (!isPlaying || sourceMoving || currentStep >= replayStepCount(doc)) return
    const previousTime =
      !doc.nativeRoute && currentStep ? doc.actions[currentStep - 1].timestamp : 0
    const duration =
      doc.nativeRoute || doc.solverOrPlayer === 'solver'
        ? 650
        : Math.min(1500, Math.max(200, doc.actions[currentStep].timestamp - previousTime))
    const timer = window.setTimeout(stepForward, duration / speed)
    return () => window.clearTimeout(timer)
  }, [isPlaying, sourceMoving, doc, currentStep, speed, stepForward])
  const count = replayStepCount(doc)
  const advancing = isPlaying || (sourceMoving && !motionPaused)
  // The store is initialized by the load effect before its first recorded frame is rendered.
  if (loadedDoc !== doc) return <p>Opening replay…</p>
  return (
    <section className="embedded-replay" aria-label="Replay playback">
      <div className="replay-heading">
        <p className="replay-summary">
          {doc.solverOrPlayer} · {doc.metrics.totalMoves} {doc.metrics.totalMoves === 1 ? 'move' : 'moves'} · {doc.status}
        </p>
        <button
          className="control"
          onClick={() =>
            downloadFile(JSON.stringify(original, null, 2), original.mazeTitle + '.fmaze-solution.json')
          }
        >
          Export replay
        </button>
      </div>
      <ReplayField
        doc={doc}
        currentStep={currentStep}
        animateStep={animateStep}
        speed={speed}
        currentPosition={currentPosition}
        trail={trail}
        onSourceMotion={setSourceMoving}
        motionPaused={motionPaused}
      />
      <div className="replay-controls">
        <button
          className="control"
          onClick={() => {
            pause()
            setMotionPaused(false)
            seekTo(0)
          }}
          aria-label="Seek to start"
        >
          ⏮
        </button>
        <button
          className="control"
          onClick={() => {
            pause()
            setMotionPaused(false)
            stepBack()
          }}
          disabled={!currentStep}
          aria-label="Step back"
        >
          ←
        </button>
        <button
          className="control control--primary"
          onClick={() => {
            setMotionPaused(advancing)
            if (advancing) pause()
            else if (!sourceMoving || currentStep < count) play()
          }}
          disabled={!count}
          aria-label={advancing ? 'Pause replay' : 'Play replay'}
        >
          {advancing ? 'Pause' : 'Play'}
        </button>
        <button
          className="control"
          onClick={() => {
            pause()
            setMotionPaused(false)
            stepForward()
          }}
          disabled={currentStep === count}
          aria-label="Step forward"
        >
          →
        </button>
        <button
          className="control"
          onClick={() => {
            pause()
            setMotionPaused(false)
            seekTo(count)
          }}
          aria-label="Seek to end"
        >
          ⏭
        </button>
        <label>
          Speed{' '}
          <select
            className="control"
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value) as typeof speed)}
          >
            {[0.5, 1, 2, 10].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="replay-timeline">
        <span>
          Step {currentStep} of {count}
        </span>
        <input
          aria-label="Replay position"
          type="range"
          min={0}
          max={count}
          value={currentStep}
          onChange={(event) => {
            pause()
            setMotionPaused(false)
            seekTo(Number(event.target.value))
          }}
        />
      </label>
    </section>
  )
}

function ReplayField({
  doc,
  currentStep,
  animateStep,
  speed,
  currentPosition,
  trail,
  onSourceMotion,
  motionPaused,
}: {
  doc: ReplayDocument
  currentStep: number
  animateStep: boolean
  speed: number
  currentPosition: PlayerPosition
  trail: PlayerPosition[]
  onSourceMotion: (moving: boolean) => void
  motionPaused: boolean
}) {
  return (
    <div className="replay-field">
      {doc.nativeRoute?.type === 'graphLabeled' ? (
        <>
          <p className="format-status">At {doc.nativeRoute.states[currentStep]}</p>
          <GraphLabeledRenderer doc={doc.maze} current={doc.nativeRoute.states[currentStep]} />
        </>
      ) : doc.nativeRoute?.type === 'blockRecursive' || doc.nativeRoute?.type === 'fractalBlock' ? (
        <BlockReplay maze={doc.maze} route={doc.nativeRoute} step={currentStep} />
      ) : doc.nativeRoute?.type === 'recursiveTour' ? (
        <TourRenderer
          def={doc.maze.definition as RecursiveTourDefinition}
          artwork={doc.maze.artwork}
          state={doc.nativeRoute.states[currentStep]}
        />
      ) : doc.nativeRoute?.type === 'repeatedDirected' ? (
        <RepeatedReplay
          def={doc.maze.definition as RepeatedDirectedDefinition}
          route={doc.nativeRoute}
          step={currentStep}
        />
      ) : doc.nativeRoute?.type === 'pathPushdown' || doc.nativeRoute?.type === 'infiniteRule' ? (
        <PathReplay
          doc={doc}
          route={doc.nativeRoute}
          step={currentStep}
          animateStep={animateStep}
          speed={speed}
          onSourceMotion={onSourceMotion}
          motionPaused={motionPaused}
        />
      ) : (
        <MazeCanvas
          doc={doc.maze}
          playerPos={currentPosition}
          trail={trail}
          maxDepth={4}
          showBlockLabels={false}
          maxDisplayWidth={680}
        />
      )}
    </div>
  )
}
