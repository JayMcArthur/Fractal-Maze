import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useImportStore } from '../../app/store/importSlice'
import { usePlayerStore } from '../../app/store/playerSlice'
import { loadMazeDocument } from '../../app/projects/loadMazeDocument'
import { loadReplay } from '../../app/projects/db'
import { bundledReplays } from '../../app/library/bundledReplays'
import { NavBar } from '../components/NavBar'
import { ImportDialog } from '../components/ImportDialog'
import { FormatPlayer } from './FormatPlayer'
import { SquarePlayer } from './SquarePlayer'

export function PlayerPage() {
  const { id } = useParams<{ id: string }>(),
    navigate = useNavigate(),
    [query] = useSearchParams()
  const replay = query.get('replay') ?? ''
  const doc = usePlayerStore((state) => state.doc),
    loadMaze = usePlayerStore((state) => state.loadMaze)
  const { pendingDoc, setPendingDoc } = useImportStore()
  const [result, setResult] = useState<{ id: string; replay: string; error?: string }>(),
    [importing, setImporting] = useState(false)
  useEffect(() => {
    if (id === 'imported' && pendingDoc) {
      loadMaze(pendingDoc)
      setPendingDoc(null)
      return
    }
    if (!id || id === 'imported') return
    let active = true
    const bundled = bundledReplays.some((bundle) => bundle.id === replay)
    const open =
      replay && !bundled
        ? loadReplay(replay).then((record) => (record?.mazeId === id ? record.doc.maze : null))
        : loadMazeDocument(id)
    void open
      .then((doc) => {
        if (!active) return
        if (doc) loadMaze(doc)
        setResult({ id, replay, error: doc ? undefined : 'This maze is not in your library.' })
      })
      .catch((error: Error) => {
        if (active) setResult({ id, replay, error: error.message })
      })
    return () => {
      active = false
    }
  }, [id, replay, pendingDoc, loadMaze, setPendingDoc])
  const current = result && result.id === id && result.replay === replay ? result : undefined
  if (!doc || (id !== 'imported' && (!current || current.error))) {
    const error = current?.error
    return (
      <div className="app-page">
        <NavBar />
        <main className="empty-state empty-state--page">
          <h1>{error ? 'Maze not found' : 'Opening maze'}</h1>
          <p>{error ?? 'Loading the maze and its play controls…'}</p>
          <div className="button-row">
            <Link className="control control--primary" to="/library">
              Open library
            </Link>
            <button className="control" onClick={() => setImporting(true)}>
              Import file
            </button>
          </div>
        </main>
        {importing && (
          <ImportDialog
            onImport={(doc) => {
              setImporting(false)
              navigate(`/play/${doc.metadata.id}`)
            }}
            onClose={() => setImporting(false)}
          />
        )}
      </div>
    )
  }
  return doc.definition.type === 'squareRecursive' ? (
    <SquarePlayer key={`${doc.metadata.id}:${replay}`} doc={doc} replay={replay} />
  ) : (
    <FormatPlayer key={`${doc.metadata.id}:${replay}`} doc={doc} />
  )
}
