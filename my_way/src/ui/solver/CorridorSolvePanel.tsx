/**
 * Solver page — configure and run the maze solver.
 * Route: /solver
 */
import { useState, useEffect } from 'react'
import { useSolverStore } from '../../app/store/solverSlice'
import { MazeCanvas } from '../components/MazeCanvas'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { ReplayRecord } from '../../app/projects/db'
import { saveReplay } from '../../app/projects/db'
import { Link, useNavigate } from 'react-router-dom'
import { buildReplay } from '../../core/replay/replayWriter'
import { fmazeExportAdapter } from '../../core/io/adapters/fmazeAdapter'
import { downloadFile } from '../../core/io/downloadFile'

export function CorridorSolvePanel({ mazeDoc }: { mazeDoc: RecursiveMazeDocument }) {
  const navigate = useNavigate()
  const [elapsedMs, setElapsedMs] = useState(0)
  const [replayId, setReplayId] = useState<string>()
  const [savingReplay, setSavingReplay] = useState(false)
  const [saveError, setSaveError] = useState('')

  const {
    status,
    nodesExplored,
    depth,
    frontier,
    foundPath,
    config,
    errorMessage,
    startSolve,
    cancelSolve,
    setConfig,
  } = useSolverStore()

  useEffect(() => {
    cancelSolve()
    return cancelSolve
  }, [mazeDoc.metadata.id, cancelSolve])

  // Elapsed timer
  useEffect(() => {
    if (status !== 'running') return
    const startedAt = Date.now()
    const interval = setInterval(() => setElapsedMs(Date.now() - startedAt), 100)
    return () => clearInterval(interval)
  }, [status])

  const handleStart = () => {
    setElapsedMs(0)
    setReplayId(undefined)
    setSaveError('')
    startSolve(mazeDoc)
  }

  const handleSaveReplay = async (play = false) => {
    if (!foundPath) return
    if (replayId) {
      if (play) navigate(`/play/${mazeDoc.metadata.id}?replay=${replayId}`)
      return
    }
    setSavingReplay(true)
    setSaveError('')
    try {
      const startedAt = new Date().toISOString()
      const replayDoc = buildReplay(mazeDoc, foundPath, 'complete', startedAt, 'solver')
      const record: ReplayRecord = {
        id: crypto.randomUUID(),
        mazeId: mazeDoc.metadata.id,
        mazeTitle: mazeDoc.metadata.title,
        doc: replayDoc,
        createdAt: new Date().toISOString(),
      }
      await saveReplay(record)
      setReplayId(record.id)
      if (play) navigate(`/play/${mazeDoc.metadata.id}?replay=${record.id}`)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save the replay.')
    } finally {
      setSavingReplay(false)
    }
  }

  const statusColor: Record<string, string> = {
    idle: 'text-muted',
    running: 'text-warning',
    solved: 'text-success',
    unsolvable: 'text-danger',
    timeout: 'text-warning',
  }

  return (
    <section className="corridor-solver">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: config panel */}
        <div className="flex flex-col gap-4">
          {/* Config */}
          <div className="surface-panel rounded-lg p-4">
            <h2 className="font-semibold mb-3">Config</h2>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center justify-between">
                <span className="text-muted">Strategy</span>
                <select
                  value={config.strategy}
                  onChange={(e) => setConfig({ strategy: e.target.value as 'bfs' | 'iddfs' })}
                  className="surface-muted border border-subtle rounded px-2 py-1"
                >
                  <option value="bfs">BFS</option>
                  <option value="iddfs">IDDFS</option>
                </select>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-muted">Max Depth</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.maxDepth}
                  onChange={(e) => setConfig({ maxDepth: Number(e.target.value) })}
                  className="surface-muted border border-subtle rounded px-2 py-1 w-20 text-right"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-muted">Max Nodes</span>
                <input
                  type="number"
                  min={100}
                  max={1000000}
                  step={1000}
                  value={config.maxNodes}
                  onChange={(e) => setConfig({ maxNodes: Number(e.target.value) })}
                  className="surface-muted border border-subtle rounded px-2 py-1 w-28 text-right"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-muted">Timeout (ms)</span>
                <input
                  type="number"
                  min={500}
                  max={60000}
                  step={500}
                  value={config.timeoutMs}
                  onChange={(e) => setConfig({ timeoutMs: Number(e.target.value) })}
                  className="surface-muted border border-subtle rounded px-2 py-1 w-28 text-right"
                />
              </label>
            </div>
          </div>

          {/* Start/Cancel */}
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={status === 'running'}
              className="flex-1 px-4 py-2 action-primary rounded  disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {status === 'running' ? 'Solving…' : 'Start'}
            </button>
            {status === 'running' && (
              <button
                onClick={cancelSolve}
                className="px-4 py-2 action-danger rounded "
              >
                Cancel
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="surface-panel rounded-lg p-4">
            <h2 className="font-semibold mb-2">Status</h2>
            <div className="text-sm flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-muted">Status</span>
                <span className={statusColor[status] ?? 'text-muted'}>
                  {status === 'unsolvable' ? 'No route within limits' : status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Nodes explored</span>
                <span>{nodesExplored.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Current depth</span>
                <span>{depth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Elapsed</span>
                <span>{(elapsedMs / 1000).toFixed(1)}s</span>
              </div>
              {errorMessage && <div className="text-warning text-xs mt-1">{errorMessage}</div>}
            </div>
          </div>

          {/* Solution */}
          {status === 'solved' && foundPath && (
            <div className="surface-panel rounded-lg p-4">
              <h2 className="font-semibold mb-2 text-success">Solution Found</h2>
              <p className="text-sm text-muted mb-3">{foundPath.length} steps</p>
              <div className="flex flex-col gap-2">
                <button
                  className="control control--primary"
                  disabled={savingReplay}
                  onClick={() => {
                    void handleSaveReplay(true)
                  }}
                >
                  Play solution
                </button>
                {replayId ? (
                  <p className="text-sm text-success">
                    Replay saved.{' '}
                    <Link to={`/play/${mazeDoc.metadata.id}`} className="underline">
                      View maze replays →
                    </Link>
                  </p>
                ) : (
                  <button
                    className="control"
                    disabled={savingReplay}
                    onClick={() => {
                      void handleSaveReplay()
                    }}
                  >
                    {savingReplay ? 'Saving…' : 'Save as Replay'}
                  </button>
                )}
                {saveError && <p role="alert">{saveError}</p>}
                {
                  <button
                    onClick={() => {
                      const text = fmazeExportAdapter.export(mazeDoc)
                      downloadFile(text, `${mazeDoc.metadata.title}.fmaze`, 'application/json')
                    }}
                    className="w-full px-4 py-2 surface-muted rounded  text-sm"
                  >
                    Export .fmaze
                  </button>
                }
              </div>
            </div>
          )}

          {(status === 'unsolvable' || status === 'timeout') && (
            <div className="surface-panel rounded-lg p-4 border border-danger">
              <p className="text-danger text-sm">
                {status === 'timeout'
                  ? 'Solver timed out. Try increasing the timeout or reducing depth.'
                  : 'No solution found within the given limits. This does not prove an unbounded recursive maze unsolvable.'}
              </p>
            </div>
          )}
        </div>

        {/* Right: canvas */}
        <div className="flex flex-col items-center gap-4">
          {
            <div
              className="border-2 border-subtle rounded overflow-auto"
              style={{ maxHeight: '420px', maxWidth: '100%' }}
            >
              <MazeCanvas
                doc={mazeDoc}
                playerPos={frontier[0]}
                maxDepth={1}
                maxDisplayWidth={400}
              />
            </div>
          }
        </div>
      </div>
    </section>
  )
}
