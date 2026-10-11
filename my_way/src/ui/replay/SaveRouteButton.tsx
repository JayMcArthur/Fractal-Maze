import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveReplay } from '../../app/projects/db'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { buildNativeReplay, nativeRouteStepCount, type NativeRoute } from '../../core/replay/nativeReplay'
import type { MazeArtwork } from '../../core/model/pathMaze'

export function SaveRouteButton({
  maze,
  route,
  source,
  complete,
  onSaved,
  playArtwork,
  disabled = false,
}: {
  maze: RecursiveMazeDocument
  route: NativeRoute
  source: 'human' | 'solver'
  complete: boolean
  onSaved?: () => void
  playArtwork?: MazeArtwork
  disabled?: boolean
}) {
  const navigate = useNavigate(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const id = crypto.randomUUID(),
        doc = buildNativeReplay(maze, route, source, complete)
      if (playArtwork) doc.playArtwork = structuredClone(playArtwork)
      await saveReplay({
        id,
        mazeId: maze.metadata.id,
        mazeTitle: maze.metadata.title,
        doc,
        createdAt: doc.startedAt,
      })
      onSaved?.()
      navigate(`/play/${maze.metadata.id}?replay=${id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save replay')
      setBusy(false)
    }
  }
  return (
    <>
      <button
        className="control control--primary"
        disabled={disabled || busy || nativeRouteStepCount(route) < 1}
        onClick={() => {
          void save()
        }}
      >
        {busy ? 'Saving…' : 'Save & play replay'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  )
}
