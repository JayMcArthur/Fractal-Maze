import { SourceRouteDrawing } from './SourceRouteDrawing'
import { useCallback, useState, type ReactNode, type RefObject } from 'react'
import type { MazeArtwork, PathMazeDefinition, PathState } from '../../core/model/pathMaze'
import {
  artworkRoute,
  distance,
  nearestTracePoint,
} from '../../core/pathMaze/artworkRoutes'
import type { ArtworkPoint } from '../../core/pathMaze/artworkRoutes'
import {
  availableMoves,
  sameState,
  reachesGoal,
} from '../../core/pathMaze/traversal'
import { SourcePlayControls } from './SourcePlayControls'
import { walkSource, sourceGateDirection } from '../../core/play/sourceWalking'
import { useMovementKeyboard } from '../player/movementKeys'
import type { DirectionBit } from '../../core/model/squareRecursive'
import { artworkDisplayGeometry } from '../../core/pathMaze/artworkDisplayGeometry'
import { blockCamera } from '../../core/play/blockArtwork'
import { usePathMotion } from './usePathMotion'
import { pathCrossing, type PathPlayFrame } from '../../core/play/pathSession'

export function SourceRouteCanvas({
  artwork,
  busy = false,
  model,
  current,
  arrivalEdges,
  onMove,
  onMotionChange,
  onVisibleStateChange,
  onWalk,
  controls,
  motionPaused = false,
  animationMs = 500,
  frame,
  keyboardScope,
  trail,
}: {
  artwork: MazeArtwork
  busy?: boolean
  model: PathMazeDefinition
  current: PathState
  arrivalEdges?: string[]
  onMove?: (edge: string) => void
  onMotionChange?: (moving: boolean) => void
  onVisibleStateChange?: (state: PathState) => void
  onWalk?: (points: ArtworkPoint[]) => void
  frame?: PathPlayFrame
  keyboardScope?: RefObject<HTMLDivElement | null>
  trail?: ArtworkPoint[][]
  controls?: ReactNode
  motionPaused?: boolean
  animationMs?: number
}) {
  const corridors = !!artwork.blockSize
  const [localView, setLocalView] = useState(true)
  const [notice, setNotice] = useState('')
  const { marker, markerRef } = usePathMotion({ artwork, model, current,
    arrivalEdges, frame, motionPaused, animationMs, onMotionChange, onVisibleStateChange })
  const display = artworkDisplayGeometry(artwork)
  const bounds = artwork.views?.find(view => view.paths.includes(marker.state.path))?.bounds ?? display.bounds
  const width = bounds[2]

  const walk = useCallback(
    (direction: DirectionBit) => {
      if (!onMove || busy || !sameState(markerRef.current.state, current)) return
      const point = markerRef.current.point
      const gate = availableMoves(model, current).find(({ edge }) => {
        const drawn = artwork.gates?.find((gate) => gate.edge === edge.id)
        return (
          drawn &&
          distance(point, drawn.from) <= width / 300 &&
          sourceGateDirection(artwork, edge, model) === direction
        )
      })
      if (gate) {
        setNotice('')
        onMove(gate.edge.id)
        return
      }
      const stops = availableMoves(model, current).flatMap(({ edge }) => {
        const gate = artwork.gates?.find((gate) => gate.edge === edge.id)
        return gate ? [gate.from] : []
      })
      if (reachesGoal(model, current)) {
        const goal =
          artwork.finishes?.find((finish) => sameState(finish.state, current))?.point ??
          artwork.goal
        if (goal) stops.push(goal)
      }
      const route = walkSource(artwork, current.path, point, direction, stops)
      if (route) {
        setNotice('')
        onWalk?.(route)
      } else
        setNotice(
          'No single route matches that direction. Choose another direction, or click the route you want.'
        )
    },
    [onMove, busy, current, model, artwork, width, onWalk, markerRef]
  )
  useMovementKeyboard({ enabled: !!onMove, move: walk, scope: keyboardScope })
  const moves =
    onMove && !busy && sameState(marker.state, current)
      ? availableMoves(model, current).filter(({ edge }) => pathCrossing(model, artwork, marker, edge.id))
      : []
  const active = artwork.traces.filter((trace) => trace.path === marker.state.path)
  return (
    <div className="source-route-player">
      <SourceRouteDrawing
        artwork={artwork}
        model={model}
        marker={marker}
        bounds={bounds}
        display={display}
        corridors={corridors}
        trail={trail}
        camera={corridors && localView ? blockCamera(bounds, marker.point, artwork.blockSize!) : undefined}
        moves={moves}
        onMove={onMove}
        onPointerDown={(event) => {
          if (!onMove || busy || event.target instanceof SVGCircleElement) return
          const matrix = event.currentTarget.getScreenCTM()
          if (!matrix) return
          const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
          const gate = moves.find(({ edge }) => {
            const drawn = artwork.gates?.find((gate) => gate.edge === edge.id)
            return drawn && distance(drawn.from, [p.x, p.y]) <= (artwork.blockSize ? artwork.blockSize * .5 : width / 65)
          })
          if (gate) {
            setNotice('')
            onMove(gate.edge.id)
            return
          }
          const hit = nearestTracePoint(active, [p.x, p.y])
          if (!hit || hit.distance > width / 50) return
          const route = artworkRoute(artwork, marker.state.path, marker.point, hit.point)
          if (route) {
            if (distance(route[0], marker.point) > 1e-6) route.unshift(marker.point)
            setNotice('')
            onWalk?.(route)
          } else
            setNotice(
              'Those strokes cross without a junction. Follow the connected route to a gate.'
            )
        }}
      />
      <SourcePlayControls notice={notice} walking={busy} playable={!!onMove}
        instruction={keyboardScope ? 'Follow the corridors, or click a gate to enter the next copy.' : undefined}
        blocks={corridors} localView={localView}
        onLocalViewChange={setLocalView} onDirection={walk} controls={controls} />
    </div>
  )
}
