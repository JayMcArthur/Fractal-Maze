import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MazeArtwork, PathMazeDefinition, PathState } from '../../core/model/pathMaze'
import {
  distance,
  nearestTracePoint,
  pointAlongRoute,
  type ArtworkPoint,
} from '../../core/pathMaze/artworkRoutes'
import { sameState } from '../../core/pathMaze/traversal'
import { artworkDisplayGeometry } from '../../core/pathMaze/artworkDisplayGeometry'
import { pathArrivalPoint, pathMotionRoutes, type PathPosition } from '../../core/play/pathGeometry'
import type { PathPlayFrame } from '../../core/play/pathSession'
import { proofCrossing } from '../../core/play/proofMovement'

/** Own only the displayed animation; authoritative positions and history belong to the session. */
export function usePathMotion({
  artwork,
  model,
  current,
  arrivalEdges,
  frame,
  motionPaused,
  animationMs,
  onMotionChange,
  onVisibleStateChange,
}: {
  artwork: MazeArtwork
  model: PathMazeDefinition
  current: PathState
  arrivalEdges?: string[]
  frame?: PathPlayFrame
  motionPaused: boolean
  animationMs: number
  onMotionChange?: (moving: boolean) => void
  onVisibleStateChange?: (state: PathState) => void
}) {
  const previousArtwork = useRef(artwork)
  const [marker, setMarker] = useState<PathPosition>(() => ({
    state: current,
    point: frame?.position.point ?? pathArrivalPoint(artwork, model, current, arrivalEdges?.at(-1)),
  }))
  const markerRef = useRef(marker)
  const animation = useRef(0)
  const paused = useRef(motionPaused)
  useEffect(() => {
    paused.current = motionPaused
  }, [motionPaused])

  const animate = useCallback(
    (points: ArtworkPoint[], done: () => void) => {
      cancelAnimationFrame(animation.current)
      const length = points
        .slice(1)
        .reduce((total, point, i) => total + distance(points[i], point), 0)
      if (length < 1e-7) {
        done()
        return
      }
      const view =
        artwork.views?.find((view) => view.paths.includes(markerRef.current.state.path))?.bounds ??
        artworkDisplayGeometry(artwork).bounds
      const duration = (length / view[2]) * animationMs * 4
      let elapsed = 0,
        previousTime = performance.now()
      onMotionChange?.(true)
      function frame(now: number) {
        if (!paused.current) elapsed += now - previousTime
        previousTime = now
        if (paused.current) {
          animation.current = requestAnimationFrame(frame)
          return
        }
        const progress = Math.min(1, elapsed / duration)
        const next = { ...markerRef.current, point: pointAlongRoute(points, progress * length) }
        markerRef.current = next
        setMarker(next)
        if (progress < 1) animation.current = requestAnimationFrame(frame)
        else {
          done()
        }
      }
      animation.current = requestAnimationFrame(frame)
    },
    [animationMs, onMotionChange, artwork]
  )

  useLayoutEffect(() => {
    const previous = frame?.from?.point
      ? { state: frame.from.state, point: frame.from.point }
      : markerRef.current
    if (!frame && previousArtwork.current !== artwork && sameState(previous.state, current)) {
      previousArtwork.current = artwork
      const hit = nearestTracePoint(
        artwork.traces.filter((trace) => trace.path === current.path),
        previous.point
      )
      if (hit) {
        const next = { state: current, point: hit.point }
        markerRef.current = next
        animation.current = requestAnimationFrame(() => setMarker(next))
      }
      return () => cancelAnimationFrame(animation.current)
    }
    previousArtwork.current = artwork
    const settle = (point: ArtworkPoint) => {
      onMotionChange?.(false)
      const next = { state: current, point }
      markerRef.current = next
      setMarker(next)
      onVisibleStateChange?.(current)
    }
    if (frame && !frame.move) {
      const point = frame.position.point ?? previous.point
      markerRef.current = { state: current, point }
      animation.current = requestAnimationFrame(() =>
        settle(point)
      )
      return () => cancelAnimationFrame(animation.current)
    }
    const edges = frame?.move?.kind === 'cross' ? frame.move.route.edges : arrivalEdges
    const proofMotion = frame?.move?.kind === 'lemma'
      ? proofCrossing(model, artwork, previous, frame.move.step)?.motion : undefined
    const { departure, entry, arrivalMotion } = proofMotion ?? pathMotionRoutes(
      artwork,
      model,
      previous,
      current,
      edges
    )
    const finish = () => {
      const next = { state: current, point: entry }
      markerRef.current = next
      setMarker(next)
      onVisibleStateChange?.(current)
      if (arrivalMotion)
        animate(arrivalMotion, () => settle(frame?.position.point ?? arrivalMotion.at(-1)!))
      else settle(frame?.position.point ?? entry)
    }
    animation.current = requestAnimationFrame(() => {
      if (frame?.move?.kind === 'walk') {
        markerRef.current = previous
        setMarker(previous)
        const points = frame.move.points
        animate(points, () => settle(frame.position.point ?? points.at(-1)!))
      } else if (departure) {
        markerRef.current = previous
        setMarker(previous)
        animate(departure, finish)
      } else finish()
    })
    return () => cancelAnimationFrame(animation.current)
  }, [
    current,
    arrivalEdges,
    artwork,
    model,
    animate,
    animationMs,
    onMotionChange,
    onVisibleStateChange,
    frame,
  ])

  const displayed = frame && !frame.move
    ? { state: current, point: frame.position.point ?? marker.point } : marker
  return { marker: displayed, markerRef }
}
