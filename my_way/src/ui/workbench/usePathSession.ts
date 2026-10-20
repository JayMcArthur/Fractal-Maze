import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { PathMazeDefinition, PathState } from '../../core/model/pathMaze'
import {
  initialPathSession,
  pathCrossing,
  appendSessionMove,
  walkPathSession,
  undoPathSession,
  sessionPathRoute,
  pathSessionFinished,
  type PathPlayFrame,
  type PathSession,
} from '../../core/play/pathSession'
import { createBlockArtwork } from '../../core/play/blockArtwork'
import type { ArtworkPoint } from '../../core/pathMaze/artworkRoutes'
import { availableMoves } from '../../core/pathMaze/traversal'
import { availableProofMoves, proofCrossing, type CheckedProofStep } from '../../core/play/proofMovement'
import { useRunGuard } from '../player/useRunGuard'

/** Canonical play history owns both PDA transitions and movement within a path. */
export function usePathSession(doc: RecursiveMazeDocument, model: PathMazeDefinition) {
  const playArtwork = useMemo(() => doc.artwork && model.start &&
    doc.artwork.traces.some(trace => trace.path === model.start!.path)
      ? createBlockArtwork(doc.artwork, model) : doc.artwork, [doc.artwork, model])
  const [session, setSession] = useState(() => initialPathSession(model, playArtwork))
  const [frame, setFrame] = useState<PathPlayFrame | undefined>(() =>
    session.positions.length ? { position: session.positions[0] } : undefined
  )
  const route = useMemo(() => sessionPathRoute(session), [session])
  const [animating, setAnimating] = useState(false)
  const [visibleState, setVisibleState] = useState<PathState | null>(model.start)
  const current = session.positions.at(-1)?.state,
    finished = !animating && pathSessionFinished(model, playArtwork, session.positions.at(-1))
  const availableEdges = useMemo(() => current ? availableMoves(model, current)
    .filter(({ edge }) => pathCrossing(model, playArtwork, session.positions.at(-1)!, edge.id))
    .map(({ edge }) => edge.id) : [], [current, model, playArtwork, session])
  const proofMoves = useMemo(() => current
    ? availableProofMoves(model, playArtwork, session.positions.at(-1)!) : [],
    [current, model, playArtwork, session])
  const markSaved = useRunGuard(session.moves.length > 0 && !finished, session)
  const commit = useCallback((next: PathSession, motion: PathPlayFrame) => {
    setSession(next)
    setFrame(motion)
    if (motion.position.point && motion.move) setAnimating(true)
  }, [])
  const onWalk = useCallback(
    (points: ArtworkPoint[]) => {
      if (animating || finished) return
      const next = walkPathSession(session, points)
      if (next === session) return
      commit(next, {
        position: { state: current!, point: points.at(-1)! },
        from: session.positions.at(-1),
        move: { kind: 'walk', points },
      })
    },
    [session, current, commit, animating, finished]
  )
  const move = useCallback(
    (id: string) => {
      if (!current || animating || finished) return
      const crossing = pathCrossing(model, playArtwork, session.positions.at(-1)!, id)
      if (crossing) commit(appendSessionMove(session, crossing.move, crossing.position), crossing)
    },
    [current, animating, finished, model, playArtwork, session, commit]
  )
  const useProof = useCallback((step: CheckedProofStep) => {
    if (!current || animating || finished) return
    const crossing = proofCrossing(model, playArtwork, session.positions.at(-1)!, step)
    if (crossing) commit(appendSessionMove(session, crossing.move, crossing.position), {
      from: session.positions.at(-1), move: crossing.move, position: crossing.position,
    })
  }, [current, animating, finished, model, playArtwork, session, commit])
  const undo = useCallback(() => {
    if (animating) return
    const next = undoPathSession(session)
    if (next.positions.length) commit(next, { position: next.positions.at(-1)! })
  }, [animating, session, commit])
  const reset = useCallback(() => {
    if (
      session.moves.length &&
      !finished &&
      !window.confirm('Restart this unfinished run? Save a replay first if you want to keep it.')
    )
      return
    const next = initialPathSession(model, playArtwork)
    setAnimating(false)
    if (next.positions.length) commit(next, { position: next.positions[0] })
  }, [model, playArtwork, commit, session.moves.length, finished])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLSelectElement ||
        event.target instanceof HTMLTextAreaElement ||
        document.querySelector('[role="dialog"]')
      )
        return
      if (['z', 'Z', 'Backspace'].includes(event.key)) {
        event.preventDefault()
        undo()
      }
      if (['r', 'R'].includes(event.key)) {
        event.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [undo, reset])
  const shown = animating ? visibleState : current
  return {
    session,
    frame,
    route,
    animating,
    current,
    shown,
    finished,
    playArtwork,
    availableEdges,
    proofMoves,
    useProof,
    onWalk,
    move,
    undo,
    reset,
    markSaved,
    setAnimating,
    setVisibleState,
    refreshFrame: () => {
      const position = session.positions.at(-1)
      setFrame(position ? { position } : undefined)
    },
  }
}
