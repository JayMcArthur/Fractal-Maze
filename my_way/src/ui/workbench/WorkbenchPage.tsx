import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { loadMazeDocument } from '../../app/projects/loadMazeDocument'
import { portPlayDocument } from '../../app/library/portPlayDocument'
import { geometricPlayDocument } from '../../app/library/geometricPlayDocument'
import { wirePlayDocument } from '../../app/library/wirePlayDocument'
import { loadProject, saveProject } from '../../app/projects/db'
import { emptyPathModel, pathDocument } from '../../app/library/pathDocument'
import { referenceDraftId } from '../../app/library/catalogIndex'
import references from '../../data/manifests/references.json'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { MazeArtwork, PathMazeDefinition } from '../../core/model/pathMaze'
import { validateMaze } from '../../core/validate/validateMaze'
import { downloadFile } from '../../core/io/downloadFile'
import { NavBar } from '../components/NavBar'
import { MazeCoverPicker } from '../components/MazeCoverPicker'
import { MazeCanvas } from '../components/MazeCanvas'
import { TraceEditor } from './TraceEditor'
import { PathModelEditor } from './PathModelEditor'
import { ProofWorkbench } from './ProofWorkbench'
import { PathPlayer } from './PathPlayer'
import { importArtwork, sourceImage } from './artworkImport'
import { reachesGoal } from '../../core/pathMaze/traversal'
import { exportPathPDA } from '../../core/pathMaze/exportPDA'

export function WorkbenchPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [query, setQuery] = useSearchParams()
  const [loaded, setLoaded] = useState<{
    id: string
    doc: RecursiveMazeDocument
    original?: RecursiveMazeDocument
  }>()
  const [error, setError] = useState('')
  useEffect(() => {
    if (!id) return
    let active = true
    const load = async () => {
      let doc =
        id === 'new'
          ? pathDocument(crypto.randomUUID(), 'Untitled block maze', emptyPathModel())
          : await loadMazeDocument(id)
      let original: RecursiveMazeDocument | undefined
      const reference = references.find((reference) => reference.id === id)
      if (!doc && reference) doc = await loadMazeDocument(referenceDraftId(id) ?? '')
      if (!doc && reference) {
        const asset = reference.asset.endsWith('.pdf')
          ? reference.asset.replace('.pdf', '.png')
          : reference.asset
        doc = pathDocument(
          `draft-${id}`,
          reference.title,
          {
            ...emptyPathModel(),
            notes: [
              'WIP: label the connected paths in this source diagram before adding recursion connections.',
            ],
          },
          await sourceImage(asset)
        )
      }
      if (!doc) throw new Error('This maze or reference is not in the collection.')
      doc = geometricPlayDocument(doc) ?? portPlayDocument(doc) ?? wirePlayDocument(doc) ?? doc
      if (doc.definition.type !== 'pathPushdown' && doc.definition.type !== 'infiniteRule') {
        original = doc
        const saved = await loadProject(`${id}-pda-wip`)
        if (saved) doc = saved.doc
        else {
          const ref = references.find((reference) => reference.playableId === id)
          const draft = ref && (await loadMazeDocument(referenceDraftId(ref.id) ?? ''))
          doc = pathDocument(
            `${id}-pda-wip`,
            `${doc.metadata.title} — source tracing`,
            {
              ...emptyPathModel(),
              notes: [
                'WIP source layout. Native movement remains in the original player. Label paths and map the gates here to create a separate PDA conversion.',
                ...(doc.definition.type === 'recursiveTour'
                  ? [
                      'This source also constrains each room’s visited cells, dots, and line counts. A path-only conversion does not preserve those rules; use the native grid tour to play the original puzzle.',
                    ]
                  : []),
              ],
            },
            draft?.artwork ?? doc.artwork
          )
        }
      }
      if (active) setLoaded({ id, doc, original })
    }
    void load().catch((failure: Error) => {
      if (active) setError(failure.message)
    })
    return () => {
      active = false
    }
  }, [id])
  if (error)
    return (
      <div className="app-page">
        <NavBar />
        <main className="page-frame">
          <h1>Workbench unavailable</h1>
          <p role="alert">{error}</p>
          <Link className="control" to="/library">
            Library
          </Link>
        </main>
      </div>
    )
  if (!loaded || (loaded.id !== id && loaded.doc.metadata.id !== id))
    return (
      <div className="app-page">
        <NavBar />
        <main className="page-frame">Opening artwork and PDA…</main>
      </div>
    )
  return (
    <Workbench
      key={loaded.doc.metadata.id}
      initial={loaded.doc}
      original={loaded.original}
      tab={query.get('tab') ?? 'trace'}
      onTab={(tab) => setQuery({ tab })}
      onSaved={(doc) => {
        if (id === 'new') {
          navigate(`/workbench/${doc.metadata.id}`, { replace: true })
        }
      }}
    />
  )
}

function Workbench({
  initial,
  original,
  tab,
  onTab,
  onSaved,
}: {
  initial: RecursiveMazeDocument
  original?: RecursiveMazeDocument
  tab: string
  onTab: (tab: string) => void
  onSaved: (doc: RecursiveMazeDocument) => void
}) {
  const navigate = useNavigate()
  const [doc, setDoc] = useState(initial)
  const [history, setHistory] = useState<RecursiveMazeDocument[]>([])
  const [status, setStatus] = useState('')
  const [loadingArtwork, setLoadingArtwork] = useState(false)
  const nativeRef = useRef<HTMLDivElement>(null)
  const model = doc.definition as PathMazeDefinition
  const update = (next: RecursiveMazeDocument) => {
    setHistory((previous) => [...previous.slice(-19), doc])
    setDoc({ ...next, metadata: { ...next.metadata, updatedAt: new Date().toISOString() } })
    setStatus('Unsaved changes')
  }
  const updateModel = (next: PathMazeDefinition) =>
    update({
      ...doc,
      definition: next,
      artwork: doc.artwork
        ? {
            ...doc.artwork,
            finishes: doc.artwork.finishes?.filter((finish) => reachesGoal(next, finish.state)),
            views: doc.artwork.views
              ?.map((view) => ({
                ...view,
                paths: view.paths.filter((id) => next.paths.some((path) => path.id === id)),
              }))
              .filter((view) => view.paths.length),
            gates: doc.artwork.gates?.filter((gate) =>
              next.connections.some((edge) => edge.id === gate.edge)
            ),
          }
        : undefined,
      representationType: next.type,
      metadata: {
        ...doc.metadata,
        tags: [
          'paths',
          'pda',
          next.review === 'wip' ? 'wip' : 'reviewed',
          ...(next.type === 'infiniteRule' ? ['infinite', 'proof'] : []),
        ],
      },
    })
  const setArtwork = (artwork: MazeArtwork) =>
    update({
      ...doc,
      artwork,
      definition: { ...model, review: 'wip' },
      metadata: {
        ...doc.metadata,
        tags: [...doc.metadata.tags.filter((tag) => tag !== 'reviewed' && tag !== 'wip'), 'wip'],
      },
    })
  const changeArtwork = async (reference: string) => {
    if (!reference) return
    setLoadingArtwork(true)
    try {
      const next = await loadMazeDocument(referenceDraftId(reference) ?? '')
      if (next?.artwork) {
        setArtwork({
          ...next.artwork,
          gates: undefined,
          start: undefined,
          goal: undefined,
          finishes: undefined,
          views: undefined,
          traces: next.artwork.traces.map((trace) => ({ ...trace, path: '' })),
        })
      } else {
        const entry = references.find((entry) => entry.id === reference)!
        setArtwork(await sourceImage(entry.asset))
      }
    } catch (failure) {
      setStatus(failure instanceof Error ? failure.message : 'Could not load artwork')
    } finally {
      setLoadingArtwork(false)
    }
  }
  const captureNative = () => {
    const drawing = nativeRef.current!
    const canvas = drawing.querySelector('canvas')
    const svg = drawing.querySelector('svg')
    if (canvas)
      setArtwork({
        asset: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
        bounds: [0, 0, canvas.width, canvas.height],
        frames: [],
        traces: [],
      })
    if (svg) {
      const copy = svg.cloneNode(true) as SVGSVGElement
      copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      const asset =
        'data:image/svg+xml;base64,' +
        btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(copy))))
      const width = svg.viewBox.baseVal.width,
        height = svg.viewBox.baseVal.height
      setArtwork({ asset, width, height, bounds: [0, 0, width, height], frames: [], traces: [] })
    }
  }
  const issues = validateMaze(doc).issues
  const exports = (
    <>
      <button
        className="control"
        onClick={() =>
          downloadFile(
            JSON.stringify(doc, null, 2),
            doc.metadata.title + '.fmaze',
            'application/json'
          )
        }
      >
        Export workbench
      </button>
      <button
        className="control"
        disabled={issues.some((issue) => issue.severity === 'error')}
        onClick={() =>
          downloadFile(
            JSON.stringify(exportPathPDA(model, doc.metadata.title), null, 2),
            doc.metadata.title + '.pda.json',
            'application/json'
          )
        }
      >
        Export PDA
      </button>
    </>
  )
  return (
    <div className="app-page">
      <NavBar />
      <main className="workbench-frame">
        <header className="workbench-heading">
          <div>
            <p className="maze-kicker">
              {model.review === 'wip' ? 'WIP / awaiting your review' : 'Reviewed conversion'} ·
              source artwork + path PDA
            </p>
            <h1>{doc.metadata.title}</h1>
            {tab !== 'proof' && (
              <label className="maze-view-select">
                Maze name
                <input
                  className="control"
                  aria-label="Maze name"
                  value={doc.metadata.title}
                  onChange={(event) =>
                    update({ ...doc, metadata: { ...doc.metadata, title: event.target.value } })
                  }
                />
              </label>
            )}
          </div>
          <div className="button-row">
            <Link className="control" to="/library">
              Library
            </Link>
            <button
              className="control"
              disabled={!history.length}
              onClick={() => {
                setDoc(history.at(-1)!)
                setHistory(history.slice(0, -1))
                setStatus('Unsaved changes')
              }}
            >
              Undo edit
            </button>
            <button
              className="control control--primary"
              disabled={issues.some((issue) => issue.severity === 'error')}
              onClick={() => {
                void saveProject(doc)
                  .then(() => {
                    setStatus('Saved to library')
                    onSaved(doc)
                  })
                  .catch((failure: Error) => setStatus(failure.message))
              }}
            >
              Save workbench
            </button>
            {tab === 'proof' ? (
              <details className="workbench-exports">
                <summary>Export</summary>
                <div className="button-row">{exports}</div>
              </details>
            ) : (
              exports
            )}
          </div>
        </header>
        {status && (
          <p role="status" className="workbench-status">
            {status}
          </p>
        )}
        <details className="workbench-notes">
          <summary>Conversion notes and unresolved details ({model.notes.length})</summary>
          {model.notes.map((note, index) => (
            <p key={index}>{note}</p>
          ))}
          <label>
            Your review notes
            <textarea
              aria-label="Review notes"
              value={model.notes.join('\n')}
              onChange={(event) => updateModel({ ...model, notes: event.target.value.split('\n') })}
            />
          </label>
        </details>
        <div className="workbench-tabs" role="tablist" aria-label="Workbench modes">
          {[
            ['trace', 'Trace & PDA'],
            ['play', 'Play preview'],
            ['proof', 'Proof notebook'],
          ].map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={tab === key ? 'control control--primary' : 'control'}
              onClick={() => onTab(key)}
            >
              {label}
            </button>
          ))}
          <button
            className="control"
            disabled={
              model.review === 'wip' &&
              (!model.start ||
                !model.goal ||
                issues.some(
                  (issue) => issue.severity === 'error' || issue.code === 'ARTWORK_PENDING'
                ))
            }
            onClick={() =>
              updateModel({ ...model, review: model.review === 'wip' ? 'reviewed' : 'wip' })
            }
          >
            {model.review === 'wip' ? 'Mark reviewed' : 'Return to WIP'}
          </button>
        </div>
        {tab === 'trace' && (
          <div className="workbench-layout">
            <section className="workbench-source">
              <MazeCoverPicker cover={doc.metadata.cover} onChange={cover =>
                update({ ...doc, metadata: { ...doc.metadata, cover } })} />
              <div className="workbench-card source-selector">
                <h2>Original layout</h2>
                <div className="workbench-toolbar">
                  <label>
                    Collection artwork
                    <select
                      aria-label="Source artwork"
                      value={
                        references.find((reference) => reference.asset === doc.artwork?.asset)
                          ?.id ?? ''
                      }
                      disabled={loadingArtwork}
                      onChange={(event) => {
                        void changeArtwork(event.target.value)
                      }}
                    >
                      <option value="">Choose artwork</option>
                      {references
                        .filter((reference) => !reference.asset.endsWith('.pdf'))
                        .map((reference) => (
                          <option key={reference.id} value={reference.id}>
                            {reference.title} · {reference.asset.endsWith('.svg') ? 'SVG' : 'image'}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="control">
                    Upload artwork
                    <input
                      className="artwork-file"
                      aria-label="Upload source artwork"
                      type="file"
                      accept=".svg,.png,.jpg,.jpeg,.webp,.gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (!file) return
                        setLoadingArtwork(true)
                        void importArtwork(file)
                          .then(setArtwork)
                          .catch((failure: Error) => setStatus(failure.message))
                          .finally(() => setLoadingArtwork(false))
                        event.target.value = ''
                      }}
                    />
                  </label>
                </div>
                <p className="workbench-help">
                  Changing artwork preserves the PDA so you can match another layout. Trace labels,
                  gates, and arrows still need review.
                </p>
              </div>
              {doc.artwork ? (
                <TraceEditor
                  artwork={doc.artwork}
                  paths={model.paths}
                  connections={model.connections}
                  onChange={setArtwork}
                />
              ) : original ? (
                <div className="workbench-card">
                  <div ref={nativeRef}>
                    <MazeCanvas doc={original} maxDepth={1} maxDisplayWidth={640} />
                  </div>
                  <button className="control control--primary" onClick={captureNative}>
                    Trace this drawing
                  </button>
                  <p>
                    Capture this native layout or select an original image above. The native player
                    remains available.
                  </p>
                </div>
              ) : (
                <div className="workbench-card">Select or upload artwork to begin tracing.</div>
              )}
              {doc.artwork && (
                <details className="workbench-card">
                  <summary>Copy frames · edit measured coordinates</summary>
                  {doc.artwork.frames.map((frame) => (
                    <div className="frame-row" key={frame.id}>
                      <strong>{frame.id}</strong>
                      {(['x', 'y', 'width', 'height'] as const).map((key) => (
                        <label key={key}>
                          {key}
                          <input
                            aria-label={`Frame ${frame.id} ${key}`}
                            type="number"
                            step=".1"
                            value={frame[key]}
                            onChange={(event) =>
                              setArtwork({
                                ...doc.artwork!,
                                frames: doc.artwork!.frames.map((item) =>
                                  item.id === frame.id
                                    ? {
                                        ...item,
                                        [key]: Math.max(
                                          key === 'width' || key === 'height' ? 0.1 : 0,
                                          Number(event.target.value)
                                        ),
                                      }
                                    : item
                                ),
                              })
                            }
                          />
                        </label>
                      ))}
                      <button
                        className="control"
                        onClick={() =>
                          setArtwork({
                            ...doc.artwork!,
                            frames: doc.artwork!.frames.filter((item) => item.id !== frame.id),
                          })
                        }
                      >
                        Remove frame
                      </button>
                    </div>
                  ))}
                </details>
              )}
            </section>
            <PathModelEditor model={model} onChange={updateModel} />
          </div>
        )}
        {tab === 'play' && (
          <PathPlayer doc={doc} model={model}>
            <button
              className="control"
              onClick={() => {
                void saveProject(doc)
                  .then(() => navigate(`/solver?id=${doc.metadata.id}`))
                  .catch((error: Error) => setStatus(error.message))
              }}
            >
              Save & solve
            </button>
            <button className="control" onClick={() => onTab('proof')}>
              Build a proof
            </button>
          </PathPlayer>
        )}
        {tab === 'proof' && <ProofWorkbench model={model} document={doc} onChange={updateModel} />}
        {original && (
          <Link className="control" to={`/play/${original.metadata.id}`}>
            Open original player →
          </Link>
        )}
        {issues
          .filter((issue) => issue.severity === 'error')
          .map((issue, index) => (
            <p role="alert" key={index}>
              {issue.message}
            </p>
          ))}
      </main>
    </div>
  )
}
