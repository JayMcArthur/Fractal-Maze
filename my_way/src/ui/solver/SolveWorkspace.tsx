import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { MazeView } from '../../app/library/mazeViews'
import { compilePlayDocument } from '../../app/library/compilePlayDocument'
import { rulePlayDocument } from '../../app/library/rulePlayDocument'
import { squarePlayPDA } from '../../app/library/playPDA'
import { CorridorSolvePanel } from './CorridorSolvePanel'
import { PDASolvePanel } from './PDASolvePanel'

export function SolveWorkspace({
  original,
  views,
  selected,
  onSelect,
}: {
  original: RecursiveMazeDocument
  views: MazeView[]
  selected: string
  onSelect: (id: string) => void
}) {
  const doc = useMemo(() => {
    const compiled = compilePlayDocument(original)
    return rulePlayDocument(compiled) ?? compiled
  }, [original])
  const binding = useMemo(
    () => (doc.definition.type === 'squareRecursive' ? squarePlayPDA(doc) : null),
    [doc]
  )
  const model =
    binding?.model ??
    (doc.definition.type === 'pathPushdown' || doc.definition.type === 'infiniteRule'
      ? doc.definition
      : null)
  const [method, setMethod] = useState('pda')
  return (
    <section className="solve-workspace">
      <header className="solve-maze-heading">
        <div>
          <h2>{doc.metadata.title}</h2>
          <p>{doc.metadata.author}</p>
        </div>
        <Link className="control" to={`/play/${doc.metadata.id}`}>
          Play maze
        </Link>
        <Link className="control" to={`/workbench/${binding?.sourceId ?? doc.metadata.id}`}>
          Edit PDA / source mapping
        </Link>
      </header>
      {binding?.sourceId && (
        <p className="workbench-help">
          This block remake uses a verified PDA. Geometry controls where each transition happens.
        </p>
      )}
      {views.length > 1 && (
        <label className="maze-view-select">
          Maze view
          <select
            className="control"
            aria-label="Solver maze view"
            value={selected}
            onChange={(event) => onSelect(event.target.value)}
          >
            {views.map((view) => (
              <option key={view.id} value={view.id}>
                {view.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {doc.definition.type === 'squareRecursive' && (
        <label className="select-field">
          Solve method
          <select
            className="control"
            aria-label="Solve method"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            <option value="pda">Simplified PDA</option>
            <option value="grid">Grid BFS / IDDFS</option>
          </select>
        </label>
      )}
      {model ? (
        method === 'grid' && doc.definition.type === 'squareRecursive' ? (
          <CorridorSolvePanel key={doc.metadata.id} mazeDoc={doc} />
        ) : (
          <PDASolvePanel key={doc.metadata.id} doc={doc} model={model} binding={binding} />
        )
      ) : (
        <div className="rail-panel">
          <p>This maze uses its own native search and movement rules.</p>
          <Link className="control" to={`/play/${doc.metadata.id}`}>
            Open maze controls
          </Link>
        </div>
      )}
    </section>
  )
}
