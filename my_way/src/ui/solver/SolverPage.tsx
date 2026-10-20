import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { loadMazeDocument } from '../../app/projects/loadMazeDocument'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { viewsForMaze } from '../../app/library/mazeViews'
import { NavBar } from '../components/NavBar'
import { SolverMazePicker } from './SolverMazePicker'
import { SolveWorkspace } from './SolveWorkspace'

export function SolverPage() {
  const [query, setQuery] = useSearchParams()
  const selected = query.get('id') ?? ''
  const [result, setResult] = useState<{
    id: string
    doc?: RecursiveMazeDocument
    error?: string
  }>()
  useEffect(() => {
    if (!selected) return
    let active = true
    void loadMazeDocument(selected)
      .then((doc) => {
        if (active)
          setResult({
            id: selected,
            doc: doc ?? undefined,
            error: doc ? undefined : 'This maze is unavailable.',
          })
      })
      .catch((error: Error) => {
        if (active) setResult({ id: selected, error: error.message })
      })
    return () => {
      active = false
    }
  }, [selected])
  const doc = result?.id === selected ? result.doc : undefined
  const select = (id: string) => setQuery({ id })
  return (
    <div className="app-page">
      <NavBar />
      <main className="page-frame solve-frame">
        <header className="page-heading">
          <div>
            <p className="maze-kicker">Search / PDA / proofs</p>
            <h1>Solve & analyze</h1>
            <p>
              Choose a maze, simplify its paths, or construct a proof for an infinite movement rule.
            </p>
          </div>
        </header>
        <SolverMazePicker
          selected={selected}
          initialType={query.get('type') ?? 'all'}
          onSelect={select}
        />
        {selected && !doc && (
          <p role="status">{result?.id === selected ? result.error : 'Loading maze…'}</p>
        )}
        {doc && (
          <SolveWorkspace
            key={doc.metadata.id}
            original={doc}
            views={viewsForMaze(selected)}
            selected={selected}
            onSelect={select}
          />
        )}
        {!selected && (
          <section className="solve-intro">
            <h2>Choose a method</h2>
            <p>
              Corridor PDAs combine connected cells into a smaller graph. Balanced copy search finds
              finite surface routes without enumerating every stack. Grid BFS and IDDFS keep
              cell-by-cell limits. Infinite and Cantor movement require checked witnesses in the
              proof notebook.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
