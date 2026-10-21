/**
 * Editor page — in-browser maze editor for SquareRecursiveDefinition.
 * Supports: structure (wall toggle), blocks, links/exits, player/trophy placement.
 * Undo/redo, validation, save to IndexedDB.
 */
import { useEffect, useCallback, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useEditorStore, type EditorMode } from '../../app/store/editorSlice'
import { useImportStore } from '../../app/store/importSlice'
import { MazeCanvas } from '../components/MazeCanvas'
import { EditorSVGOverlay } from './EditorSVGOverlay'
import { ValidationOverlay } from './ValidationOverlay'
import { StructurePanel } from './panels/StructurePanel'
import { BlocksPanel } from './panels/BlocksPanel'
import { TeleportersPanel } from './panels/TeleportersPanel'
import { LinksPanel } from './panels/LinksPanel'
import { PlayerPanel } from './panels/PlayerPanel'
import { MetadataPanel } from './panels/MetadataPanel'
import { ExportDialog } from '../components/ExportDialog'
import { validateMaze } from '../../core/validate/validateMaze'
import { saveProject } from '../../app/projects/db'
import { loadMazeDocument } from '../../app/projects/loadMazeDocument'
import type { SquareRecursiveDefinition } from '../../core/model/squareRecursive'
import { NavBar } from '../components/NavBar'

const MODES: Array<{ id: EditorMode; label: string }> = [
  { id: 'structure', label: 'Structure' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'links', label: 'Links' },
  { id: 'player', label: 'Player' },
  { id: 'metadata', label: 'Info' },
]

export function EditorPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const store = useEditorStore()
  const { doc, mode, selectedBlock, undoStack, redoStack } = store
  const { newMaze, loadDoc } = store
  const setPendingDoc = useImportStore((s) => s.setPendingDoc)
  const [loadResult, setLoadResult] = useState<{ id: string; error?: string }>()
  const [showExport, setShowExport] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

  // Load existing doc or create new
  useEffect(() => {
    if (!id) {
      newMaze()
      return
    }
    if (id === useEditorStore.getState().doc?.metadata.id) return
    let active = true
    loadMazeDocument(id)
      .then((nextDoc) => {
        if (!active) return
        if (!nextDoc) {
          setLoadResult({ id, error: 'This maze is not in your library.' })
        } else if (nextDoc.representationType === 'squareRecursive') {
          loadDoc(nextDoc)
          setLoadResult({ id })
        } else {
          navigate(`/play/${nextDoc.metadata.id}`, { replace: true })
        }
      })
      .catch((error: Error) => {
        if (active) setLoadResult({ id, error: error.message })
      })
    return () => {
      active = false
    }
  }, [id, newMaze, loadDoc, setPendingDoc, navigate])

  const handleSave = useCallback(async () => {
    if (!doc) return
    try {
      await saveProject(doc)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      if (!id) navigate(`/editor/${doc.metadata.id}`, { replace: true })
    } catch {
      setSaveStatus('error')
    }
  }, [doc, id, navigate])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        store.undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        store.redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave, store]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleCellClick = (row: number, col: number) => {
    if (!doc) return
    if (mode === 'blocks') {
      store.selectBlock(
        def.blocks.find((block) => block.row === row && block.col === col)?.name ?? null
      )
    }
    if (mode === 'player') {
      store.setPlayerPos(row, col)
    }
  }

  if (!doc || (id && doc.metadata.id !== id)) {
    return (
      <div className="app-page min-h-screen flex flex-col">
        <NavBar />
        <main className="empty-state flex-1">
          <span aria-hidden="true">⌁</span>
          <h1>{loadResult?.error ? 'Maze unavailable' : 'Preparing workshop'}</h1>
          <p>{loadResult?.error ?? 'Loading the editable maze document…'}</p>
          <Link className="control" to="/library">
            Open library
          </Link>
        </main>
      </div>
    )
  }

  const def = doc.definition as SquareRecursiveDefinition
  const validation = validateMaze(doc)

  return (
    <div className="editor-page min-h-screen surface-page text-ink flex flex-col">
      <NavBar />
      {/* Top bar */}
      <header className="surface-panel border-b border-subtle px-4 py-2 flex items-center gap-3 flex-wrap">
        <span className="maze-kicker">Maze workshop</span>
        <span className="text-ink font-semibold truncate max-w-xs">{doc.metadata.title}</span>

        <div className="editor-actions ml-auto flex gap-2 items-center">
          {/* Undo/redo */}
          <button
            onClick={() => store.undo()}
            disabled={undoStack.length === 0}
            className="px-2 py-1 surface-muted disabled:opacity-30 rounded text-sm"
            title="Undo (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            onClick={() => store.redo()}
            disabled={redoStack.length === 0}
            className="px-2 py-1 surface-muted disabled:opacity-30 rounded text-sm"
            title="Redo (Ctrl+Y)"
          >
            ↪
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            className={`control ${saveStatus === 'error' ? 'action-danger' : 'control--primary'}`}
          >
            {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? '✗ Error' : 'Save'}
          </button>

          {/* Export */}
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1 surface-muted rounded text-sm"
          >
            Export
          </button>
          <button className="control" onClick={async () => {
            await saveProject(doc)
            navigate(`/workbench/${doc.metadata.id}`)
          }}>Convert artwork</button>

          {/* Preview — push current doc into the import store so PlayerPage always gets it */}
          <button
            onClick={() => {
              setPendingDoc(doc)
              navigate('/play/imported')
            }}
            className="px-3 py-1 action-secondary rounded text-sm"
          >
            Preview ▶
          </button>
        </div>
      </header>

      <div className="editor-body flex flex-1 overflow-hidden">
        {/* Mode toolbar */}
        <nav className="editor-tools surface-panel border-r border-subtle flex flex-col pt-4 px-2 gap-1 w-28 flex-shrink-0">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => store.setMode(m.id)}
              className={`px-2 py-2 rounded text-sm font-semibold text-center ${
                mode === m.id
                  ? 'action-primary text-ink'
                  : 'text-muted '
              }`}
            >
              {m.label}
            </button>
          ))}
        </nav>

        {/* Canvas area */}
        <main className="editor-field flex-1 overflow-auto surface-inset flex items-start justify-center p-6">
          <div className="relative inline-block border-2 border-subtle rounded">
            <MazeCanvas doc={doc} maxDepth={1} showBlockLabels={true} showBreadcrumbs={false} />
            <EditorSVGOverlay
              def={def}
              mode={mode}
              selectedBlock={selectedBlock}
              onToggleWall={store.toggleWall}
              onCellClick={handleCellClick}
            />
          </div>
        </main>

        {/* Right panel */}
        <aside className="editor-inspector w-72 surface-panel border-l border-subtle flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-4">
            {/* Mode panel */}
            {mode === 'structure' && <StructurePanel def={def} store={store} />}
            {mode === 'blocks' && (
              <BlocksPanel def={def} selectedBlock={selectedBlock} store={store} />
            )}
            {mode === 'links' && (
              <>
                <LinksPanel def={def} store={store} />
                <TeleportersPanel def={def} store={store} />
              </>
            )}
            {mode === 'player' && <PlayerPanel def={def} store={store} />}
            {mode === 'metadata' && <MetadataPanel doc={doc} store={store} />}

            {/* Validation */}
            <div className="border-t border-subtle pt-4">
              <p className="text-muted text-xs font-semibold uppercase mb-2">Validation</p>
              <ValidationOverlay result={validation} />
            </div>
          </div>
        </aside>
      </div>

      {showExport && <ExportDialog doc={doc} onClose={() => setShowExport(false)} />}
    </div>
  )
}
