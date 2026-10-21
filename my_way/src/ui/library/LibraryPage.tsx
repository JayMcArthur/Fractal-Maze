import { MazeCard } from './LibraryMazeCard'
import { assetUrl } from '../../core/io/assetUrl'
import references from '../../data/manifests/references.json'
import { referenceDraftId, sourcePlayableId } from '../../app/library/catalogIndex'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { defaultPlayId, mazeCatalog, viewsForMaze } from '../../app/library/mazeViews'
import { authorCollections } from '../../app/library/authorCollections'
import { saveProject, listProjects, listSolves } from '../../app/projects/db'
import type { ProjectRecord, SolveRecord } from '../../app/projects/db'
import { Dialog } from '../components/Dialog'
import { ImportDialog } from '../components/ImportDialog'
import { NavBar } from '../components/NavBar'
import { MazeCoverPicker } from '../components/MazeCoverPicker'
import { loadMazeDocument } from '../../app/projects/loadMazeDocument'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'


export function LibraryPage() {
  const [query, setQuery] = useSearchParams()
  const collection = query.get('tab') === 'references' ? 'references' : 'mazes'
  const setCollection = (tab: 'mazes' | 'references') => setQuery(tab === 'references' ? { tab } : {})
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [authorFilter, setAuthorFilter] = useState('all')
  const [showImport, setShowImport] = useState(false)
  const [solves, setSolves] = useState<SolveRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const navigate = useNavigate()
  const [coverDoc, setCoverDoc] = useState<RecursiveMazeDocument>()
  const [coverError, setCoverError] = useState('')
  const openCover = async (id: string) => {
    setCoverError('')
    try {
      const doc = await loadMazeDocument(id)
      if (!doc) throw new Error('This maze is unavailable.')
      setCoverDoc(doc)
    } catch (failure) {
      setCoverError(failure instanceof Error ? failure.message : 'Could not open maze.')
    }
  }

  useEffect(() => {
    void listProjects().then(setProjects)
    void listSolves()
      .then(setSolves)
      .catch(() => setSolves([]))
  }, [])

  const allTags = useMemo(
    () =>
      Array.from(
        new Set([
          ...mazeCatalog.flatMap((maze) => maze.tags),
          ...projects.flatMap((project) => project.doc.metadata.tags),
        ])
      ).sort(),
    [projects]
  )
  const solveMap = useMemo(() => new Map(solves.map((solve) => [solve.id, solve])), [solves])
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project.doc])),
    [projects]
  )
  const matchesFilter = (title: string, author: string | undefined, tags: string[]) => {
    const term = search.trim().toLowerCase()
    return (
      (!term || `${title} ${author ?? ''} ${tags.join(' ')}`.toLowerCase().includes(term)) &&
      (tagFilter === 'all' || tags.includes(tagFilter))
    )
  }
  const savedProjects = projects.filter(
    (project) =>
      !mazeCatalog.some((entry) => entry.id === project.id) &&
      (authorFilter === 'all' || project.doc.metadata.author === authorFilter) &&
      matchesFilter(project.title, project.doc.metadata.author, project.doc.metadata.tags)
  )
  const filtered = mazeCatalog.filter((maze) => {
    const saved = projectMap.get(maze.id)
    const viewMatches = viewsForMaze(maze.id).some((view) => matchesFilter(view.label, '', []))
    return (authorFilter === 'all' || (saved?.metadata.author ?? maze.author) === authorFilter) && (viewMatches || matchesFilter(
      saved?.metadata.title ?? maze.title,
      saved?.metadata.author ?? maze.author,
      saved?.metadata.tags ?? maze.tags
    ))
  })
  const mazeAuthors = authorCollections(mazeCatalog, (entry) => projectMap.get(entry.id)?.metadata.author ?? entry.author)
  const groups = authorCollections(filtered, (entry) => projectMap.get(entry.id)?.metadata.author ?? entry.author)
  const referenceGroups = authorCollections(references.filter((entry) =>
    (authorFilter === 'all' || entry.author === authorFilter) &&
    `${entry.title} ${entry.author} ${entry.source}`.toLowerCase().includes(search.trim().toLowerCase())
  ), (entry) => entry.author)

  return (
    <div className="app-page library-page">
      <NavBar />
      <main className="page-frame">
        <header className="page-heading library-heading">
          <div>
            <p className="maze-kicker">Maze collection / {mazeCatalog.length} mazes</p>
            <h1>Choose your maze.</h1>
            <p>
              Browse by author, then choose a maze and its block layout.
            </p>
          </div>
          <div className="library-heading__stats" aria-label="Library progress">
            <strong>
              {solves.length}
              <small>solved</small>
            </strong>
            <button className="control control--primary" onClick={() => setShowImport(true)}>
              Import maze
            </button>
            <Link className="control" to="/build">
              Create maze
            </Link>
          </div>
        </header>

        {coverError && !coverDoc && <p role="alert">{coverError}</p>}
        <div className="collection-tabs" aria-label="Library collections">
          <button
            className={collection === 'mazes' ? 'control control--primary' : 'control'}
            onClick={() => setCollection('mazes')}
          >
            Interactive mazes ({mazeCatalog.length})
          </button>
          <button
            className={collection === 'references' ? 'control control--primary' : 'control'}
            onClick={() => setCollection('references')}
          >
            Reference artwork ({references.length})
          </button>
        </div>
        <section className="library-toolbar" aria-label="Maze filters">
          <label className="search-field">
            <span>Search</span>
            <input
              type="search"
              placeholder="Title, author, or tag"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          {collection === 'mazes' && (
            <label className="select-field">
              <span>Maze type</span>
              <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option value="all">All mazes</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="select-field">
            <span>Author</span>
            <select aria-label="Author" value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)}>
              <option value="all">All authors</option>
              {(collection === 'mazes' ? mazeAuthors : authorCollections(references, (entry) => entry.author)).map((group) =>
                <option key={group.author} value={group.author}>{group.author}</option>
              )}
            </select>
          </label>
          <span className="library-toolbar__count">
            {collection === 'mazes'
              ? `Showing ${filtered.length} of ${mazeCatalog.length}`
              : `${references.length} source images and diagrams`}
          </span>
        </section>

        {collection === 'references' ? (
          <section aria-label="Reference artwork" className="author-collections">
            {referenceGroups.map((group) => <section className="author-collection" key={group.author} aria-label={group.author}>
              <div className="section-heading"><h2>{group.author}</h2><span>{group.entries.length} {group.entries.length === 1 ? 'reference' : 'references'}</span></div>
              <div className="library-grid">{group.entries.map((entry) => (
                <article className="library-card" key={entry.id}>
                  <Link className="library-card__preview" to={`/reference/${entry.id}`}>
                    {entry.asset.endsWith('.pdf') ? (
                      <strong>PDF artwork</strong>
                    ) : (
                      <img
                        src={assetUrl(entry.asset)}
                        alt={entry.title}
                        loading="lazy"
                      />
                    )}
                  </Link>
                  <div className="library-card__body">
                    <div>
                      <p className="maze-kicker">{entry.kind}</p>
                      <h2>{entry.title}</h2>
                      <p>{entry.author}</p>
                    </div>
                    <span className="library-card__type">
                      {entry.playableId
                        ? 'Reference · interactive version available'
                        : referenceDraftId(entry.id) ? 'WIP conversion available' : 'Source diagram'}
                    </span>
                  </div>
                  <div className="library-card__actions">
                    <Link className="control" to={`/reference/${entry.id}`}>
                      View artwork
                    </Link>
                    <Link className="control" to={`/workbench/${referenceDraftId(entry.id) ?? entry.id}`}>Review WIP / trace</Link>
                    {(sourcePlayableId(entry.id) ?? entry.playableId) && (
                      <Link className="control" to={`/play/${defaultPlayId((sourcePlayableId(entry.id) ?? entry.playableId)!)}`}>
                        Play version
                      </Link>
                    )}
                  </div>
                </article>
              ))}</div>
            </section>)}
          </section>
        ) : filtered.length ? (
          <section aria-label="Maze library" className="author-collections">
            {groups.map((group) => <section className="author-collection" key={group.author} aria-label={group.author}>
              <div className="section-heading"><h2>{group.author}</h2><span>{group.entries.length} {group.entries.length === 1 ? 'maze' : 'mazes'}</span></div>
              <div className="library-grid">{group.entries.map((entry) => (
              <MazeCard
                key={entry.id}
                onCoverClick={() => { void openCover(entry.id) }}
                entry={entry}
                solve={solveMap.get(entry.id)}
                savedDoc={projectMap.get(entry.id)}
              />
            ))}</div>
            </section>)}
          </section>
        ) : (
          <section className="empty-state">
            <span aria-hidden="true">⌁</span>
            <h2>No matching mazes</h2>
            <p>Try another title, author, or collection.</p>
            <button
              className="control"
              onClick={() => {
                setSearch('')
                setTagFilter('all')
                setAuthorFilter('all')
              }}
            >
              Clear filters
            </button>
          </section>
        )}

        {savedProjects.length > 0 && (
          <section className="replay-shelf">
            <div className="section-heading">
              <h2>Your mazes</h2>
            </div>
            <div className="library-grid">
              {savedProjects.map((project) => (
                <MazeCard
                  key={project.id}
                  onCoverClick={() => { void openCover(project.id) }}
                  savedDoc={project.doc}
                  entry={{
                    id: project.id,
                    title: project.title,
                    author: project.doc.metadata.author ?? '',
                    source: null,
                    file: '',
                    representationType: project.doc.representationType,
                    tags: project.doc.metadata.tags,
                  }}
                />
              ))}
            </div>
          </section>
        )}

      </main>

      {coverDoc && (
        <Dialog title={`Cover for ${coverDoc.metadata.title}`} onClose={() => setCoverDoc(undefined)}
          footer={<>
            <button className="control" onClick={() => setCoverDoc(undefined)}>Cancel</button>
              <button className="control control--primary" onClick={() => {
                void saveProject({ ...coverDoc, metadata: { ...coverDoc.metadata, updatedAt: new Date().toISOString() } })
                  .then(() => listProjects()).then(setProjects).then(() => setCoverDoc(undefined))
                  .catch((failure: Error) => setCoverError(failure.message))
              }}>Save cover</button>
          </>}>
            <MazeCoverPicker cover={coverDoc.metadata.cover} onChange={cover =>
              setCoverDoc({ ...coverDoc, metadata: { ...coverDoc.metadata, cover } })} />
          {coverError && <p role="alert" className="text-danger">{coverError}</p>}
        </Dialog>
      )}

      {showImport && (
        <ImportDialog
          onImport={(doc) => {
            navigate(`/play/${doc.metadata.id}`)
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  )
}
