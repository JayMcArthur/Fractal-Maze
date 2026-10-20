import { useMemo, useRef, useState, type ReactNode } from 'react'
import type {
  MazeArtwork,
  PathMazeDefinition,
  PathState,
  ProofStep,
} from '../../core/model/pathMaze'
import type { ArtworkPoint } from '../../core/pathMaze/artworkRoutes'
import { pathArrivalPoint, pathMotionRoutes } from '../../core/play/pathGeometry'
import { pathCrossing, type PathPlayPosition } from '../../core/play/pathSession'
import { SourceRouteCanvas } from './SourceRouteCanvas'
import { CopyAddress } from '../components/CopyAddress'
import { copyAddress } from '../../core/pathMaze/copyAddress'
import { sameState } from '../../core/pathMaze/traversal'

/** Physical walking is local to this board; only legal PDA crossings become proof steps. */
export function WitnessMaze({
  model,
  artwork,
  start,
  current,
  steps,
  onChange,
  controls,
}: {
  model: PathMazeDefinition
  artwork: MazeArtwork
  start: PathState
  current: PathState
  steps: ProofStep[]
  onChange: (steps: ProofStep[]) => void
  controls?: ReactNode
}) {
  const scope = useRef<HTMLDivElement>(null)
  const drawing = useMemo(
    () => ({
      ...artwork,
      start: pathArrivalPoint(artwork, model, start),
      goal: undefined,
      finishes: [],
    }),
    [artwork, model, start]
  )
  const walkingModel = useMemo(
    () => ({ ...model, start, goal: null, alternateGoals: [] }),
    [model, start]
  )
  const initial = useMemo<PathPlayPosition>(
    () => ({
      state: current,
      point: pathArrivalPoint(drawing, walkingModel, current, steps.at(-1)?.reference),
    }),
    [drawing, walkingModel, current, steps]
  )
  const [view, setView] = useState<{
    steps: ProofStep[]
    position: PathPlayPosition
    trail: ArtworkPoint[][]
  } | null>(null)
  const owned = view?.steps === steps && sameState(view.position.state, current) ? view : null
  const position = owned?.position ?? initial
  const frame = useMemo(() => ({ position }), [position])
  const trail = owned?.trail ?? []
  const move = (id: string) => {
    const crossing = pathCrossing(walkingModel, drawing, position, id)
    if (!crossing || !position.point) return
    const next = [
      ...steps,
      ...crossing.move.route.edges.map((reference) => ({
        kind: 'edge' as const,
        reference,
        reverse: false,
      })),
    ]
    const motion = pathMotionRoutes(
      drawing,
      walkingModel,
      { state: position.state, point: position.point },
      crossing.position.state,
      crossing.move.route.edges
    )
    const sameCopy =
      position.state.address.join('\0') === crossing.position.state.address.join('\0')
    setView({
      steps: next,
      position: crossing.position,
      trail: [
        ...(sameCopy ? [...trail, ...(motion.departure ? [motion.departure] : [])] : []),
        ...(motion.arrivalMotion ? [motion.arrivalMotion] : []),
      ],
    })
    onChange(next)
  }
  return (
    <div
      ref={scope}
      className="witness-maze"
      tabIndex={0}
      aria-label="Maze movement controls"
      onPointerDownCapture={() => scope.current?.focus({ preventScroll: true })}
    >
      <div className="witness-maze__position">
        <span>
          Path {model.paths.find((path) => path.id === position.state.path)?.label} · Depth{' '}
          {copyAddress(model, position.state).length}
        </span>
        <CopyAddress address={copyAddress(model, position.state)} />
      </div>
      <SourceRouteCanvas
        artwork={drawing}
        model={walkingModel}
        current={position.state}
        frame={frame}
        controls={controls}
        keyboardScope={scope}
        trail={trail}
        showLineLabels
        onMove={move}
        onWalk={(points) => {
          setView({
            steps,
            position: { state: position.state, point: points.at(-1)! },
            trail: [...trail, points],
          })
        }}
      />
    </div>
  )
}
