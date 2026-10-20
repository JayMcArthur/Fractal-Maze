import { useRunGuard } from './useRunGuard'
import { useCallback, useState } from 'react'
import { useMovementKeyboard } from './movementKeys'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { RecursiveTourDefinition, TourGate } from '../../core/model/recursiveTour'
import {
  currentTourRoom,
  moveTour,
  playTourMoves,
  startTour,
  tourComplete,
  tourCounts,
} from '../../core/recursiveTour/movement'
import { TourRenderer } from '../../core/render/svg/TourRenderer'
import { SaveRouteButton } from '../replay/SaveRouteButton'
import { TouchPad } from '../components/TouchPad'

const bits: Record<number, TourGate> = { 8: 'N', 4: 'E', 2: 'S', 1: 'W' }

export function TourPlayer({ doc }: { doc: RecursiveMazeDocument }) {
  const def = doc.definition as RecursiveTourDefinition
  const [history, setHistory] = useState(() => [startTour(def)])
  const [step, setStep] = useState(0)
  const [status, setStatus] = useState(
    'Enter through the north gate. Visit every dot and at least one studio.'
  )
  const [source, setSource] = useState<'human' | 'solver'>('human')
  const [markings, setMarkings] = useState(false)
  const state = history[step],
    room = currentTourRoom(state),
    complete = tourComplete(state)
  const { rows, columns } = tourCounts(def, room)
  const markSaved = useRunGuard(source === 'human' && step > 0 && !complete, history)

  const move = useCallback(
    (direction: TourGate) => {
      const result = moveTour(def, state, direction)
      if ('error' in result) {
        setStatus(result.error)
        return
      }
      setHistory([...history.slice(0, step + 1), result.state])
      setStep(step + 1)
      setSource('human')
      setStatus(
        tourComplete(result.state)
          ? 'Tour complete. Every room meets its counts and dots.'
          : 'Path extended.'
      )
    },
    [def, state, history, step]
  )
  useMovementKeyboard({ enabled: !complete, move: direction => move(bits[direction]) })
  const restart = () => {
    setHistory([startTour(def)])
    setStep(0)
    setSource('human')
    setMarkings(false)
    setStatus('New tour from the north gate.')
  }
  return (
    <>
      <p className="format-status">
        {complete ? 'Tour complete' : `Room ${room.address.join(' → ') || 'surface'}`} · step {step}{' '}
        · entered {room.entry}
      </p>
      <div className="tour-workspace">
        <div>
          <TourRenderer
            def={def}
            artwork={doc.artwork}
            state={state}
            markings={markings}
            onCell={(cell) => {
              const here = room.cells.at(-1)!,
                dr = Math.floor(cell / def.size) - Math.floor(here / def.size),
                dc = (cell % def.size) - (here % def.size)
              if (Math.abs(dr) + Math.abs(dc) === 1)
                move(dr ? (dr > 0 ? 'S' : 'N') : dc > 0 ? 'E' : 'W')
              else setStatus('Choose a neighboring square or use the direction buttons.')
            }}
          />
          <TouchPad onDirection={(bit) => move(bits[bit])} disabled={complete} />
          <p className="format-note">
            Click a neighboring square, use arrow keys or WASD. At a border gate, move outward to
            leave.
          </p>
        </div>
        <aside className="rail-panel">
          <h2>Room checks</h2>
          <p>
            Dots {def.dots.filter((dot) => room.cells.includes(dot)).length} / {def.dots.length}
          </p>
          <table className="tour-counts">
            <thead>
              <tr>
                <th>Line</th>
                <th>Row</th>
                <th>Column</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((count, i) => (
                <tr key={i}>
                  <th>{i + 1}</th>
                  <td className={def.rowCounts[i] === count ? 'tour-count-met' : ''}>
                    {count} / {def.rowCounts[i] ?? '—'}
                  </td>
                  <td className={def.columnCounts[i] === columns[i] ? 'tour-count-met' : ''}>
                    {columns[i]} / {def.columnCounts[i] ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Each blue studio counts as one square here. Its miniature has its own path and counts.
          </p>
          <div className="button-row">
            <button
              className="control"
              disabled={!step}
              onClick={() => {
                setStep(step - 1)
                setStatus('Returned to the previous step. A new move replaces the later path.')
              }}
            >
              Undo
            </button>
            <button
              className="control"
              disabled={step + 1 >= history.length}
              onClick={() => {
                setStep(step + 1)
                setStatus('Advanced one recorded step.')
              }}
            >
              Next step
            </button>
            <button className="control" onClick={restart}>
              Restart
            </button>
          </div>
          <SaveRouteButton
            onSaved={markSaved}
            maze={doc}
            route={{ type: 'recursiveTour', states: history.slice(0, step + 1) }}
            source={source}
            complete={complete}
          />
        </aside>
      </div>
      <p role="status" className="format-note">
        {status}
      </p>
      <details className="rail-panel">
        <summary>Rules and conversion notes</summary>
        <p>
          Draw one continuous path between different gates in each room. Visit every dot, meet the
          numbered row and column counts, and never cross or retrace a square. The root tour starts
          north and must enter a studio. Each studio repeats this same puzzle.
        </p>
        <p>
          Unnumbered lines have no count restriction. Undo changes your drawing; walking backward
          along it is prohibited. Gates and copies keep their orientation.
        </p>
        <p>
          WIP: the grid is extracted from the original drawing. The independent local search agrees
          with the published gate-pair counts; the supplied tour is checked against every room’s
          rules.
        </p>
        {doc.metadata.source && (
          <a href={doc.metadata.source} target="_blank" rel="noreferrer">
            Original puzzle and exit-marking instructions
          </a>
        )}
      </details>
      {def.providedMoves && (
        <div className="button-row">
          <button
            className="control"
            onClick={() => {
              setHistory(playTourMoves(def, def.providedMoves!))
              setStep(0)
              setSource('solver')
              setStatus('Supplied solution loaded. Use Next step to reveal it gradually.')
            }}
          >
            Load supplied solution
          </button>
        </div>
      )}
      {complete && (
        <TourMarkings doc={doc} state={state} markings={markings} setMarkings={setMarkings} />
      )}
    </>
  )
}

function TourMarkings({
  doc,
  state,
  markings,
  setMarkings,
}: {
  doc: RecursiveMazeDocument
  state: ReturnType<typeof startTour>
  markings: boolean
  setMarkings: (value: boolean) => void
}) {
  const [index, setIndex] = useState(0)
  return (
    <section className="rail-panel">
      <h2>Completed rooms</h2>
      <label>
        Room{' '}
        <select
          className="control"
          value={index}
          onChange={(event) => setIndex(Number(event.target.value))}
        >
          {state.rooms.map((room, i) => (
            <option key={i} value={i}>
              {room.address.join(' → ') || 'surface'} · {room.entry} → {room.exit}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={markings}
          onChange={(event) => setMarkings(event.target.checked)}
        />{' '}
        Show squares marked by the exit instructions
      </label>
      <TourRenderer
        def={doc.definition as RecursiveTourDefinition}
        artwork={doc.artwork}
        state={state}
        roomIndex={index}
        markings={markings}
      />
      <p>
        The marks use each room’s own step numbering. The final-exit marks also apply to the surface
        room.
      </p>
    </section>
  )
}
