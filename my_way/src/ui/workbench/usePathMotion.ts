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
import { copyZoom } from '../../core/play/copyZoom'
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
  localView,
}: {
  artwork: MazeArtwork
  model: PathMazeDefinition
  current: PathState
  arrivalEdges?: string[]
  frame?: PathPlayFrame
  localView: boolean
  motionPaused: boolean
  animationMs: number
  onMotionChange?: (moving: boolean) => void
  onVisibleStateChange?: (state: PathState) => void
}) {
  const previousArtwork = useRef(artwork)
  const [moving, setMoving] = useState(false)
  const [copyView, setCopyView] = useState<{
    owner: PathPlayFrame | PathState
    camera: number[]
    marker: PathPosition
    copy: string
  } | null>(null)
  const owner = frame ?? current
  const [marker, setMarker] = useState<PathPosition>(() => ({
    state: current,
    point: frame?.position.point ?? pathArrivalPoint(artwork, model, current, arrivalEdges?.at(-1)),
  }))
  const markerRef = useRef(marker)
  const animation = useRef(0)
  const paused = useRef(motionPaused)
  const local = useRef(localView)
  useEffect(() => {
    paused.current = motionPaused
    local.current = localView
  }, [motionPaused, localView])

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
      setMoving(true)
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

  const zoom = useCallback(
    (from: PathPosition, entry: ArtworkPoint, done: () => void) => {
      const plan =
        frame?.move?.kind === 'lemma'
          ? null
          : copyZoom(artwork, model, from, { state: current, point: entry }, local.current)
      if (!plan || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        done()
        return
      }
      setMoving(true)
      onMotionChange?.(true)
      let elapsed = 0,
        previousTime = performance.now()
      const duration = animationMs * 0.6
      const tick = (now: number) => {
        if (!paused.current) elapsed += now - previousTime
        previousTime = now
        const progress = Math.min(1, elapsed / duration)
        const eased = progress * progress * (3 - 2 * progress)
        setCopyView({
          owner,
          copy: plan.copy,
          marker: {
            ...plan.marker,
            point: [
              plan.marker.point[0] + (plan.markerTo[0] - plan.marker.point[0]) * eased,
              plan.marker.point[1] + (plan.markerTo[1] - plan.marker.point[1]) * eased,
            ],
          },
          camera: plan.from.map((value, i) => value + (plan.to[i] - value) * eased),
        })
        if (progress < 1) animation.current = requestAnimationFrame(tick)
        else {
          setCopyView(null)
          done()
        }
      }
      animation.current = requestAnimationFrame(tick)
    },
    [artwork, model, current, animationMs, onMotionChange, owner, frame]
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
      setMoving(false)
      onMotionChange?.(false)
      const next = { state: current, point }
      markerRef.current = next
      setMarker(next)
      onVisibleStateChange?.(current)
    }
    if (frame && !frame.move) {
      const point = frame.position.point ?? previous.point
      markerRef.current = { state: current, point }
      animation.current = requestAnimationFrame(() => settle(point))
      return () => cancelAnimationFrame(animation.current)
    }
    const edges = frame?.move?.kind === 'cross' ? frame.move.route.edges : arrivalEdges
    const proofMotion =
      frame?.move?.kind === 'lemma'
        ? proofCrossing(model, artwork, previous, frame.move.step)?.motion
        : undefined
    const { departure, entry, arrivalMotion } =
      proofMotion ?? pathMotionRoutes(artwork, model, previous, current, edges)
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
        animate(departure, () => zoom(markerRef.current, entry, finish))
      } else zoom(previous, entry, finish)
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
    zoom,
  ])

  const displayed =
    frame && !frame.move ? { state: current, point: frame.position.point ?? marker.point } : marker
  const activeCopy = copyView?.owner === owner ? copyView : null
  return {
    marker: activeCopy?.marker ?? displayed,
    markerRef,
    moving: frame && !frame.move ? false : moving,
    copyCamera: activeCopy?.camera,
    zoomingCopy: activeCopy?.copy,
  }
}
