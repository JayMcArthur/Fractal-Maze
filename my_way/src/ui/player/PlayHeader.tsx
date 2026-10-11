import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { adjacentMaze, mazeCatalog, viewsForMaze } from '../../app/library/mazeViews'

export function PlayHeader({ doc, children }: { doc: RecursiveMazeDocument; children: ReactNode }) {
  const navigate = useNavigate(),
    primary = viewsForMaze(doc.metadata.id)[0]?.id ?? doc.metadata.id
  const known = mazeCatalog.some((entry) => entry.id === primary)
  return (
    <header className="player-selector">
      <button
        className="icon-control"
        disabled={!known}
        aria-label="Previous maze"
        onClick={() => navigate(`/play/${adjacentMaze(doc.metadata.id, -1).id}`)}
      >
        ←
      </button>
      <label className="maze-select">
        <span>Maze</span>
        <select
          aria-label="Play maze"
          value={known ? primary : ''}
          onChange={(event) => navigate(`/play/${event.target.value}`)}
        >
          {!known && <option value="">{doc.metadata.title}</option>}
          {mazeCatalog.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.title}
            </option>
          ))}
        </select>
      </label>
      <button
        className="icon-control"
        disabled={!known}
        aria-label="Next maze"
        onClick={() => navigate(`/play/${adjacentMaze(doc.metadata.id, 1).id}`)}
      >
        →
      </button>
      <div className="player-title">
        <p className="maze-kicker">{doc.metadata.author}</p>
        <h1>{doc.metadata.title}</h1>
      </div>
      <div className="player-selector__actions">{children}</div>
    </header>
  )
}
