import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import type { PathRoute } from '../../core/pathMaze/traversal'
import { squareActionsFromPDA, type SquarePDA } from '../../core/play/squarePDA'
import { exportPathPDA } from '../../core/pathMaze/exportPDA'
import { downloadFile } from '../../core/io/downloadFile'
import { buildReplay } from '../../core/replay/replayWriter'
import { saveReplay } from '../../app/projects/db'
import { SaveRouteButton } from '../replay/SaveRouteButton'
import { PathInputControls } from '../workbench/PathInputControls'
import { reachesGoal } from '../../core/pathMaze/traversal'
import { PathMazeDrawing } from '../workbench/PathMazeDrawing'
import { MazeCanvas } from '../components/MazeCanvas'

export function PDASolvePanel({
  doc,
  model,
  binding,
}: {
  doc: RecursiveMazeDocument
  model: PathMazeDefinition
  binding: SquarePDA | null
}) {
  const navigate = useNavigate(),
    worker = useRef<Worker | null>(null)
  const [method, setMethod] = useState<'balanced' | 'bounded'>('balanced')
  const [depth, setDepth] = useState(8),
    [running, setRunning] = useState(false),
    [route, setRoute] = useState<PathRoute | null>(null),
    [message, setMessage] = useState('')
  const [step, setStep] = useState(0),
    [saving, setSaving] = useState(false)
  useEffect(() => () => worker.current?.terminate(), [])
  const search = () => {
    worker.current?.terminate()
    const next = new Worker(new URL('../../core/play/pda.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.current = next
    setRoute(null)
    setStep(0)
    setRunning(true)
    setMessage('Searching the PDA…')
    next.onmessage = (event: MessageEvent<{ route: PathRoute | null; message: string }>) => {
      setRoute(event.data.route)
      setMessage(event.data.message)
      setRunning(false)
      next.terminate()
      worker.current = null
    }
    next.onerror = () => {
      setMessage('The search worker could not finish.')
      setRunning(false)
      next.terminate()
      worker.current = null
    }
    next.postMessage({ model, method, depth })
  }
  const saveSquare = async () => {
    if (!route || doc.definition.type !== 'squareRecursive') return
    setSaving(true)
    try {
      const actions = squareActionsFromPDA(doc.definition, binding!, route)
      const replay = buildReplay(doc, actions, 'complete', new Date().toISOString(), 'solver'),
        id = crypto.randomUUID()
      await saveReplay({
        id,
        mazeId: doc.metadata.id,
        mazeTitle: doc.metadata.title,
        doc: replay,
        createdAt: replay.startedAt,
      })
      navigate(`/play/${doc.metadata.id}?replay=${id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save solution.')
      setSaving(false)
    }
  }
  return (
    <section className="pda-solver">
      <div className="rail-panel">
        <h2>Simplified PDA</h2>
        <p>
          Each connected corridor is one state. Entering a copy pushes its name; leaving it pops
          that name.
        </p>
        <dl className="session-grid">
          <div>
            <dt>Path states</dt>
            <dd>{model.paths.length}</dd>
          </div>
          <div>
            <dt>Connections</dt>
            <dd>{model.connections.length}</dd>
          </div>
        </dl>
        <label className="select-field">
          <span>PDA method</span>
          <select
            className="control"
            aria-label="PDA method"
            value={method}
            onChange={(event) => setMethod(event.target.value as typeof method)}
          >
            <option value="balanced">
              Balanced copy search
            </option>
            <option value="bounded">Bounded breadth-first search</option>
          </select>
        </label>
        <p>
          {method === 'balanced'
            ? 'Checks finite routes to a declared finish, without a recursion-depth limit.'
            : 'Searches up to 20,000 states at your chosen recursion depth.'}
        </p>
        {method === 'bounded' && (
          <label className="select-field">
            Search depth
            <input
              className="control"
              aria-label="PDA search depth"
              type="number"
              min={1}
              max={64}
              value={depth}
              onChange={(event) => setDepth(Math.max(1, Math.min(64, Number(event.target.value))))}
            />
          </label>
        )}
        <div className="button-row">
          <button
            className="control control--primary"
            disabled={running || !model.start || !model.goal}
            onClick={search}
          >
            Find finite route
          </button>
          {running && (
            <button
              className="control"
              onClick={() => {
                worker.current?.terminate()
                worker.current = null
                setRunning(false)
                setMessage('Search cancelled.')
              }}
            >
              Cancel search
            </button>
          )}
          <button
            className="control"
            onClick={() =>
              downloadFile(
                JSON.stringify(exportPathPDA(model), null, 2),
                `${doc.metadata.title}.pda.json`
              )
            }
          >
            Export PDA
          </button>
        </div>
        <p role="status">{message}</p>
        {!model.connections.some((edge) => !edge.input) && (
          <PathInputControls
            model={model}
            onResult={(route, message) => {
              setRoute(route)
              setStep(0)
              setMessage(message)
            }}
          />
        )}
        {route && (
          <div className="button-row">
            {doc.definition.type === 'squareRecursive' ? (
              <button
                className="control control--primary"
                disabled={saving}
                onClick={() => {
                  void saveSquare()
                }}
              >
                {saving ? 'Saving…' : 'Play solution'}
              </button>
            ) : (
              <SaveRouteButton
                maze={doc}
                source="solver"
                complete={reachesGoal(model, route.states.at(-1)!)}
                route={{ type: model.type, ...route }}
              />
            )}
          </div>
        )}
      </div>
      <PDAPreview doc={doc} model={model} route={route} step={step} onStep={setStep} />
    </section>
  )
}

function PDAPreview({
  doc,
  model,
  route,
  step,
  onStep,
}: {
  doc: RecursiveMazeDocument
  model: PathMazeDefinition
  route: PathRoute | null
  step: number
  onStep: (step: number) => void
}) {
  const arrivalEdges = useMemo(
    () => (route && step ? [route.edges[step - 1]] : undefined),
    [route, step]
  )
  return (
    <div className="solver-preview">
      {doc.definition.type === 'squareRecursive' ? (
        <MazeCanvas doc={doc} maxDepth={2} maxDisplayWidth={600} />
      ) : (
        <PathMazeDrawing
          model={model}
          artwork={doc.artwork}
          current={route?.states[step] ?? model.start ?? undefined}
          arrivalEdges={arrivalEdges}
        />
      )}
      {route && doc.definition.type !== 'squareRecursive' && (
        <div className="solution-controls button-row">
          <button className="control" disabled={!step} onClick={() => onStep(step - 1)}>
            Previous route step
          </button>
          <span>
            Step {step} / {route.edges.length}
          </span>
          <button className="control" onClick={() => onStep(route.edges.length)}>
            Route end
          </button>
          <button
            className="control"
            disabled={step === route.edges.length}
            onClick={() => onStep(step + 1)}
          >
            Next route step
          </button>
        </div>
      )}
      {model.allowedRule !== 'finite' && (
        <Link className="control" to={`/workbench/${doc.metadata.id}?tab=proof`}>
          Construct an infinite proof
        </Link>
      )}
    </div>
  )
}
