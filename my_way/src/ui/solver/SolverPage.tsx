import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { MazeView } from '../../app/library/mazeViews'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { mazeCatalog, viewsForMaze } from '../../app/library/mazeViews'
import { catalogIndex as catalog } from '../../app/library/catalogIndex'
import { listProjects, type ProjectRecord } from '../../app/projects/db'
import { loadMazeDocument } from '../../app/projects/loadMazeDocument'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { squarePlayPDA } from '../../app/library/playPDA'
import { portPlayDocument } from '../../app/library/portPlayDocument'
import { geometricPlayDocument } from '../../app/library/geometricPlayDocument'
import { wirePlayDocument } from '../../app/library/wirePlayDocument'
import { rulePlayDocument } from '../../app/library/rulePlayDocument'
import { NavBar } from '../components/NavBar'
import { CorridorSolvePanel } from './CorridorSolvePanel'
import { PDASolvePanel } from './PDASolvePanel'

export function SolverPage() {
  const [query, setQuery] = useSearchParams(),
    selected = query.get('id') ?? ''
  const [search, setSearch] = useState(''),
    [author, setAuthor] = useState('all'),
    [type, setType] = useState(query.get('type') ?? 'all')
  const [projects, setProjects] = useState<ProjectRecord[]>([]),
    [result, setResult] = useState<{ id: string; doc?: RecursiveMazeDocument; error?: string }>()
  useEffect(() => {
    void listProjects().then(setProjects)
  }, [])
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
  const matchingView = (id: string) =>
    viewsForMaze(id).find((view) =>
      mazeTypeMatches(catalog.find((entry) => entry.id === view.id)!.representationType, type)
    )?.id ?? id
  const filtered = entries.filter(
    (entry) =>
      (!term || `${entry.title} ${entry.author}`.toLowerCase().includes(term)) &&
      (author === 'all' || (entry.author || 'Unknown author') === author) &&
      (mazeTypeMatches(entry.representationType, type) ||
        viewsForMaze(entry.id).some((view) =>
          mazeTypeMatches(catalog.find((entry) => entry.id === view.id)!.representationType, type)
        ))
  )
  const storedDoc = result?.id === selected ? result.doc : undefined
  const doc = useMemo(
    () =>
      storedDoc ? geometricPlayDocument(storedDoc) ?? portPlayDocument(storedDoc) ?? wirePlayDocument(storedDoc) ?? rulePlayDocument(storedDoc) ?? storedDoc : undefined,
    [storedDoc]
  )
  const binding = useMemo(
    () => (doc?.definition.type === 'squareRecursive' ? squarePlayPDA(doc) : null),
    [doc]
  )
  const model = useMemo(
    () =>
      binding
        ? binding.model
        : doc?.definition.type === 'pathPushdown' || doc?.definition.type === 'infiniteRule'
          ? doc.definition
          : null,
    [doc, binding]
  )
  const views = viewsForMaze(selected)
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
                onClick={() => setQuery({ id: matchingView(entry.id) })}
              >
                <strong>{entry.title}</strong>
                <small>{entry.author}</small>
              </button>
            ))}
          </div>
          {!filtered.length && <p>No matching mazes. Change your search or filters.</p>}
        </section>
        {selected && !doc && (
          <p role="status">{result?.id === selected ? result.error : 'Loading maze…'}</p>
        )}
        {doc && (
          <SolveWorkspace
            doc={doc}
            binding={binding}
            model={model}
            views={views}
            selected={selected}
            onSelect={(id) => setQuery({ id: id })}
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

function SolveWorkspace({
  doc,
  binding,
  model,
  views,
  selected,
  onSelect,
}: {
  doc: RecursiveMazeDocument
  binding: ReturnType<typeof squarePlayPDA> | null
  model: PathMazeDefinition | null
  views: MazeView[]
  selected: string
  onSelect: (id: string) => void
}) {
  const [method, setMethod] = useState('pda')
  return (
    <section className="solve-workspace" key={doc.metadata.id}>
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
          This view shares a verified PDA with{' '}
          {views.find((view) => view.id === binding.sourceId)?.label}. Geometry controls where each
          transition happens.
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

const solverTypes = [
  ['all', 'All types'],
  ['corridors', 'Block corridors'],
  ['paths', 'Source / PDA paths'],
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
