import { useRunGuard } from './useRunGuard'
import { SaveRouteButton } from '../replay/SaveRouteButton'
import { appendRouteState } from '../../core/replay/routeHistory'
import { useEffect, useRef, useState } from 'react'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { RepeatedDirectedDefinition } from '../../core/model/repeatedDirected'
import {
  repeatedPosition,
  repeatedNeighbors,
  repeatedStateKey,
} from '../../core/model/repeatedDirected'
import type { RepeatedSolveResult } from '../../core/solver/traversal/repeatedSolver'
import { RepeatedRenderer } from '../../core/render/svg/RepeatedRenderer'

export function RepeatedPlayer({ doc }: { doc: RecursiveMazeDocument }) {
  const [routeSource, setRouteSource] = useState<'human' | 'solver'>('human')
  const def = doc.definition as RepeatedDirectedDefinition
  const [fullMap, setFullMap] = useState(false)
  const [history, setHistory] = useState(() => [repeatedPosition(def, def.start)])
  const [step, setStep] = useState(0)
  const [limit, setLimit] = useState(20)
  const [status, setStatus] = useState('Choose a directed connection to move.')
  const [solving, setSolving] = useState(false)
  const worker = useRef<Worker | null>(null)
  useEffect(() => () => worker.current?.terminate(), [])
  const current = history[step]
  const won = repeatedStateKey(current) === repeatedStateKey(repeatedPosition(def, def.goal))
  const choices = won ? [] : repeatedNeighbors(def, current)
  const markSaved = useRunGuard(routeSource === 'human' && step > 0 && !won, history)

  const solve = () => {
    worker.current?.terminate()
    const nextWorker = new Worker(
      new URL('../../core/workers/repeatedWorker.ts', import.meta.url),
      { type: 'module' }
    )
    worker.current = nextWorker
    setSolving(true)
    setStatus(`Searching coordinates 0–${limit}, at most 100,000 states…`)
    nextWorker.onmessage = (event: MessageEvent<RepeatedSolveResult>) => {
      nextWorker.terminate()
      worker.current = null
      setSolving(false)
      const result = event.data
      setStatus(
        result.status === 'solved'
          ? `Shortest route found: ${result.path.length - 1} directed connections, ${result.visited} states examined. Step through it below.`
          : `No route found within coordinates 0–${limit} and 100,000 states. This does not prove the infinite maze unsolvable.`
      )
      if (result.status === 'solved') {
        setHistory(result.path)
        setStep(0)
        setRouteSource('solver')
      }
    }
    nextWorker.onerror = () => {
      nextWorker.terminate()
      worker.current = null
      setSolving(false)
      setStatus('The search failed. Try again.')
    }
    nextWorker.postMessage({ definition: def, limit })
  }
  return (
    <>
      <p className="format-status" role="status">
        {won ? 'Goal reached' : `At (${current.x}, ${current.y}, ${current.terminal})`} · step{' '}
        {step}
      </p>
      <div className="format-field">
        <RepeatedRenderer
          def={def}
          current={current}
          trail={history.slice(0, step + 1)}
          detail={fullMap ? 'all' : 'available'}
        />
      </div>
      <label>
        <input
          type="checkbox"
          checked={fullMap}
          onChange={(event) => setFullMap(event.target.checked)}
        />{' '}
        Show full connection map
      </label>
      <div className="button-row">
        <button className="control" disabled={!step} onClick={() => setStep(step - 1)}>
          Previous step
        </button>
        <button
          className="control"
          disabled={step + 1 >= history.length}
          onClick={() => setStep(step + 1)}
        >
          Next step
        </button>
        <button
          className="control"
          onClick={() => {
            setHistory([repeatedPosition(def, def.start)])
            setStep(0)
            setRouteSource('human')
          }}
        >
          Restart
        </button>
        {choices.map((next) => (
          <button
            key={repeatedStateKey(next)}
            className="control"
            onClick={() => {
              setRouteSource('human')
              const route = appendRouteState(history.slice(0, step + 1), next, repeatedStateKey)
              setHistory(route)
              setStep(route.length - 1)
            }}
          >
            Go to ({next.x}, {next.y}, {next.terminal})
          </button>
        ))}
      </div>
      {def.providedRoute && def.providedRoute.length > 1 && (
        <div className="button-row">
          <button
            className="control"
            onClick={() => {
              setHistory(def.providedRoute!)
              setStep(0)
              setRouteSource('solver')
              setStatus(
                `Bundled solution loaded: ${def.providedRoute!.length - 1} directed connections.`
              )
            }}
          >
            Load bundled solution
          </button>
        </div>
      )}
      <div className="button-row">
        <label>
          Coordinate limit{' '}
          <input
            className="control"
            aria-label="Coordinate limit"
            type="number"
            min="1"
            max="200"
            value={limit}
            onChange={(event) =>
              setLimit(Math.max(1, Math.min(200, Number(event.target.value) || 1)))
            }
          />
        </label>
        <button className="control" disabled={solving} onClick={solve}>
          Find shortest route
        </button>
        {solving && (
          <button
            className="control"
            onClick={() => {
              worker.current?.terminate()
              worker.current = null
              setSolving(false)
              setStatus('Search cancelled.')
            }}
          >
            Cancel search
          </button>
        )}
      </div>
      <div className="button-row">
        <SaveRouteButton
          onSaved={markSaved}
          maze={doc}
          route={{
            type: 'repeatedDirected',
            states: routeSource === 'solver' ? history : history.slice(0, step + 1),
          }}
          source={routeSource}
          complete={routeSource === 'solver' || won}
        />
      </div>
      <p role="status" className="format-note">
        {status}
      </p>
      <p className="format-note">
        {def.zero
          ? 'W, E, N and S are separate terminals. Crossing a block boundary is an action; C terminals stay inside the block. Origin rules apply only at (0,0).'
          : 'W terminals share the left block’s E terminal; S terminals share the lower block’s N terminal.'}{' '}
        The maze continues beyond this moving window. Navigation has no coordinate cap; search is
        bounded.
      </p>
    </>
  )
}
