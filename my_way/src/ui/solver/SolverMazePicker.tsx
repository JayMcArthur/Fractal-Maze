import { useEffect, useState } from 'react'
import { mazeCatalog, viewsForMaze, type MazeView } from '../../app/library/mazeViews'
import { catalogIndex as catalog } from '../../app/library/catalogIndex'
import { listProjects, type ProjectRecord } from '../../app/projects/db'

export function SolverMazePicker({
  selected,
  initialType,
  onSelect,
}: {
  selected: string
  initialType: string
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [author, setAuthor] = useState('all')
  const [type, setType] = useState(initialType)
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  useEffect(() => {
    void listProjects().then(setProjects)
  }, [])
  const entries = [
    ...mazeCatalog.map((entry) => {
      const saved = projects.find((project) => project.id === entry.id)?.doc
      return saved
        ? {
            ...entry,
            title: saved.metadata.title,
            author: saved.metadata.author ?? '',
            representationType: saved.representationType,
          }
        : entry
    }),
    ...projects
      .filter((project) => !catalog.some((entry) => entry.id === project.id))
      .map((project) => ({
        id: project.id,
        title: project.title,
        author: project.doc.metadata.author ?? '',
        representationType: project.doc.representationType,
      })),
  ]
  const authors = [...new Set(entries.map((entry) => entry.author || 'Unknown author'))].sort()
  const term = search.trim().toLowerCase()
  const representations = new Map([
    ...catalog.map((entry) => [entry.id, entry.representationType] as const),
    ...projects.map((project) => [project.id, project.doc.representationType] as const),
  ])
  const matchesView = (view: MazeView) => mazeTypeMatches(representations.get(view.id)!, type)
  const matchingView = (id: string) => viewsForMaze(id).find(matchesView)?.id ?? id
  const filtered = entries.filter(
    (entry) =>
      (!term || `${entry.title} ${entry.author}`.toLowerCase().includes(term)) &&
      (author === 'all' || (entry.author || 'Unknown author') === author) &&
      (mazeTypeMatches(entry.representationType, type) || viewsForMaze(entry.id).some(matchesView))
  )
  const views = viewsForMaze(selected)
  return (
    <section className="solver-maze-picker" aria-label="Solver maze selection">
      <div className="library-toolbar">
        <label className="search-field">
          <span>Search mazes</span>
          <input
            type="search"
            aria-label="Search solver mazes"
            placeholder="Title or author"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="select-field">
          <span>Author</span>
          <select
            className="control"
            aria-label="Solver author"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
          >
            <option value="all">All authors</option>
            {authors.map((author) => (
              <option key={author}>{author}</option>
            ))}
          </select>
        </label>
        <label className="select-field">
          <span>Maze type</span>
          <select
            className="control"
            aria-label="Solver maze type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {solverTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="solver-maze-results" role="group" aria-label="Matching mazes">
        {filtered.map((entry) => (
          <button
            key={entry.id}
            className={
              views.some((view) => view.id === entry.id) || entry.id === selected
                ? 'control control--primary'
                : 'control'
            }
            onClick={() =>
              onSelect(
                mazeTypeMatches(entry.representationType, type) ? entry.id : matchingView(entry.id)
              )
            }
          >
            <strong>{entry.title}</strong>
            <small>{entry.author}</small>
          </button>
        ))}
      </div>
      {!filtered.length && <p>No matching mazes. Change your search or filters.</p>}
    </section>
  )
}
const solverTypes = [
  ['all', 'All types'],
  ['corridors', 'Block corridors'],
  ['paths', 'PDA paths'],
  ['infinite', 'Infinite rules'],
  ['recursivePorts', 'Recursive ports'],
  ['repeatedDirected', 'Repeated directed'],
  ['blockRecursive', 'Block patterns'],
  ['recursiveTour', 'Grid tours'],
  ['geometricRecursive', 'Geometric gates'],
  ['graphLabeled', 'Portal graphs'],
  ['legacyWire', 'Wolfram 2 source'],
]
function mazeTypeMatches(representation: string, filter: string) {
  if (filter === 'all') return true
  if (filter === 'corridors') return representation === 'squareRecursive'
  if (filter === 'paths') return ['pathPushdown', 'infiniteRule'].includes(representation)
  if (filter === 'infinite') return representation === 'infiniteRule'
  return representation === filter
}
