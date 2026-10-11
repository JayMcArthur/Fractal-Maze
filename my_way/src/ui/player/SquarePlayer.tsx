import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { PlayHeader } from './PlayHeader'
import { MazePlayArea } from './MazePlayArea'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { findCatalogEntry } from '../../app/library'
import { adjacentMaze } from '../../app/library/mazeViews'
import { MazeViewSelect } from '../library/MazeViewSelect'
import { listSolves, saveSolve, saveProject } from '../../app/projects/db'
import type { SolveRecord } from '../../app/projects/db'
import { usePlayerStore } from '../../app/store/playerSlice'
import { useSquareKeyboard } from './movementKeys'
import type { SquareRecursiveDefinition } from '../../core/model/squareRecursive'
import { ExportDialog } from '../components/ExportDialog'
import { HUD } from '../components/HUD'
import { ImportDialog } from '../components/ImportDialog'
import { MazeCanvas } from '../components/MazeCanvas'
import { NavBar } from '../components/NavBar'
import { TouchPad } from '../components/TouchPad'
import { useRunGuard } from './useRunGuard'

export function SquarePlayer({ doc, replay }: { doc: RecursiveMazeDocument; replay: string }) {
  const navigate = useNavigate()
  const stageRef = useRef<HTMLDivElement>(null)
  const {
    position,
    history,
    isWon,
    pathStack,
    sessionStartMs,
    completedAtMs,
    lastActionId,
    lastActionType,
    move,
    reset,
    undo,
    saveReplay,
  } = usePlayerStore()
  const [showImport, setShowImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [replayState, setReplayState] = useState<{
    mazeId: string
    status: 'saving' | 'saved'
  } | null>(null)
  const [bestMoves, setBestMoves] = useState<number>()
  const [clock, setClock] = useState(() => Date.now())
  const [maxDepth, setMaxDepth] = useState(4)
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true)
  const [showBlockLabels, setShowBlockLabels] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [showTools, setShowTools] = useState(false)

  const entry = findCatalogEntry(doc.metadata.id)
  const moveCount = history.length
  const elapsedMs = Math.max(0, (completedAtMs ?? clock) - sessionStartMs)
  const markSaved = useRunGuard(!replay && moveCount > 0 && !isWon, history)
  const saveStatus: 'idle' | 'saving' | 'saved' =
    replayState && replayState.mazeId === doc.metadata.id ? replayState.status : 'idle'

  useEffect(() => {
    if (isWon || replay) return
    const timer = window.setInterval(() => setClock(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [isWon, replay])

  useEffect(() => {
    void listSolves()
      .then((solves) =>
        setBestMoves(solves.find((solve) => solve.id === doc.metadata.id)?.bestMoves)
      )
      .catch(() => setBestMoves(undefined))
  }, [doc])

  useEffect(() => {
    if (!isWon) return
    const record: SolveRecord = {
      id: doc.metadata.id,
      mazeTitle: doc.metadata.title,
      bestMoves: moveCount,
      solvedAt: new Date().toISOString(),
    }
    void saveSolve(record).then(() =>
      setBestMoves((current) => Math.min(current ?? moveCount, moveCount))
    )
  }, [doc, isWon, moveCount])

  const saveCurrentReplay = useCallback(() => {
    if (saveStatus === 'saving') return
    const mazeId = doc.metadata.id
    setReplayState({ mazeId, status: 'saving' })
    void saveReplay()
      .then((id) => {
        setReplayState({ mazeId, status: 'saved' })
        if (id) {
          markSaved()
          navigate(`/play/${mazeId}?replay=${id}`)
        }
      })
      .catch(() => setReplayState(null))
  }, [doc, saveReplay, saveStatus, navigate, markSaved])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void stageRef.current?.requestFullscreen()
    } else {
      void document.exitFullscreen()
    }
  }, [])

  const toggleHelp = useCallback(() => setShowHelp((visible) => !visible), [])
  useSquareKeyboard({
    enabled: !replay && !showImport && !showExport,
    won: isWon,
    move,
    undo,
    reset,
    onHelp: toggleHelp,
    onFullscreen: toggleFullscreen,
  })

  const goAdjacent = (offset: -1 | 1) => {
    if (!entry) return navigate('/library')
    navigate(`/play/${adjacentMaze(entry.id, offset).id}`)
  }

  const squareDef = doc.definition as SquareRecursiveDefinition
  const transitionClass = lastActionType ? `maze-transition--${lastActionType}` : ''

  return (
    <div className="app-page player-page">
      <NavBar />
      <main className="player-frame">
        <PlayHeader doc={doc}>
          {
            <button
              className="control"
              onClick={async () => {
                await saveProject(doc)
                navigate(`/editor/${doc.metadata.id}`)
              }}
            >
              Edit
            </button>
          }
          <button className="control" onClick={() => setShowImport(true)}>
            Import
          </button>
          <button className="control" onClick={() => setShowExport(true)}>
            Export
          </button>
          <button
            className="control player-tools-toggle"
            onClick={() => setShowTools((visible) => !visible)}
            aria-expanded={showTools}
          >
            Settings
          </button>
        </PlayHeader>
        <MazeViewSelect id={doc.metadata.id} play />

        {!replay && (
          <HUD
            position={position}
            moveCount={moveCount}
            elapsedMs={elapsedMs}
            isWon={isWon}
            bestMoves={bestMoves}
          />
        )}

        <MazePlayArea doc={doc}>
          <div className="player-layout">
            <section className="player-field" aria-label="Maze field">
              <div
                ref={stageRef}
                className={`maze-stage maze-stage--depth-${Math.min(position.blockStack.length - 1, 3)}`}
                style={{ touchAction: 'none' }}
              >
                <span
                  key={lastActionId}
                  className={`maze-field-feedback ${transitionClass}`}
                  aria-hidden="true"
                />
                <div className="maze-transition">
                  <MazeCanvas
                    doc={doc}
                    playerPos={position}
                    trail={pathStack}
                    maxDepth={maxDepth}
                    showBlockLabels={showBlockLabels}
                    showBreadcrumbs={showBreadcrumbs}
                    colorScheme={highContrast ? 'highContrast' : 'default'}
                    maxDisplayWidth={760}
                  />
                </div>
              </div>
              {
                <div className="player-mobile-controls">
                  <TouchPad onDirection={move} disabled={isWon} />
                  <p>Arrow keys · WASD · IJKL · Touch</p>
                </div>
              }
            </section>

            <aside className={`player-rail ${showTools ? 'is-open' : ''}`}>
              <section className="rail-panel">
                <div className="rail-panel__heading">
                  <div>
                    <p className="maze-kicker">Live run</p>
                    <h2>Session</h2>
                  </div>
                  <span className="signal-badge">Active</span>
                </div>
                <dl className="session-grid">
                  <div>
                    <dt>Recursive depth</dt>
                    <dd>{position.blockStack.length - 1}</dd>
                  </div>
                  <div>
                    <dt>Field size</dt>
                    <dd>
                      {squareDef.grid.cols}×{squareDef.grid.rows}
                    </dd>
                  </div>
                </dl>
                <div className="control-grid">
                  <button className="control" onClick={undo} disabled={moveCount === 0}>
                    Undo <kbd>Z</kbd>
                  </button>
                  <button className="control" onClick={reset}>
                    Restart <kbd>R</kbd>
                  </button>
                  <button className="control" onClick={saveCurrentReplay}>
                    {saveStatus === 'saved'
                      ? 'Replay saved'
                      : saveStatus === 'saving'
                        ? 'Saving…'
                        : 'Save replay'}
                  </button>
                </div>
              </section>

              <section className="rail-panel">
                <div className="rail-panel__heading">
                  <div>
                    <p className="maze-kicker">Field optics</p>
                    <h2>Display</h2>
                  </div>
                </div>
                <label className="range-row">
                  <span>
                    Recursive detail <b>{maxDepth}</b>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    value={maxDepth}
                    onChange={(event) => setMaxDepth(Number(event.target.value))}
                  />
                </label>
                <label className="switch-row">
                  <span>Breadcrumb trail</span>
                  <input
                    type="checkbox"
                    checked={showBreadcrumbs}
                    onChange={(event) => setShowBreadcrumbs(event.target.checked)}
                  />
                </label>
                <label className="switch-row">
                  <span>Block labels</span>
                  <input
                    type="checkbox"
                    checked={showBlockLabels}
                    onChange={(event) => setShowBlockLabels(event.target.checked)}
                  />
                </label>
                <label className="switch-row">
                  <span>High contrast</span>
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(event) => setHighContrast(event.target.checked)}
                  />
                </label>
              </section>
              <section className="rail-panel rail-panel--compact">
                <button className="rail-link" onClick={() => setShowHelp((visible) => !visible)}>
                  Keyboard map <kbd>H</kbd>
                  <span>→</span>
                </button>
                <button className="rail-link" onClick={toggleFullscreen}>
                  Fullscreen field <kbd>F</kbd>
                  <span>→</span>
                </button>
                <Link className="rail-link" to={`/solver?id=${doc.metadata.id}`}>
                  Solve & analyze<span>→</span>
                </Link>
                <Link className="rail-link" to="/library">
                  Browse collection<span>→</span>
                </Link>
              </section>

              {showHelp && (
                <section className="rail-panel shortcut-panel">
                  <p className="maze-kicker">Control map</p>
                  <div>
                    <span>Move</span>
                    <kbd>Arrows / WASD / IJKL</kbd>
                    <span>Undo</span>
                    <kbd>Z / Backspace</kbd>
                    <span>Restart</span>
                    <kbd>R</kbd>
                  </div>
                </section>
              )}
            </aside>
          </div>
        </MazePlayArea>
      </main>

      {isWon && !replay && (
        <div
          className="victory-layer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="victory-title"
        >
          <div className="victory-card">
            <div className="victory-mark" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <p className="maze-kicker">Exit reached</p>
            <h2 id="victory-title">Maze escaped.</h2>
            <p>
              {moveCount} moves · {Math.round(elapsedMs / 100) / 10}s · depth{' '}
              {Math.max(...history.map((action) => action.to.blockStack.length - 1), 0)}
            </p>
            {bestMoves === moveCount && (
              <strong className="personal-best">New personal best</strong>
            )}
            <div className="button-row">
              <button className="control control--primary" onClick={reset}>
                Run it again
              </button>
              <button className="control" onClick={saveCurrentReplay}>
                {saveStatus === 'saved' ? 'Replay saved' : 'Save replay'}
              </button>
              <button className="control" onClick={() => goAdjacent(1)}>
                Next maze
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportDialog
          onImport={(nextDoc) => {
            setShowImport(false)
            navigate(`/play/${nextDoc.metadata.id}`)
          }}
          onClose={() => setShowImport(false)}
        />
      )}
      {showExport && <ExportDialog doc={doc} onClose={() => setShowExport(false)} />}
    </div>
  )
}
