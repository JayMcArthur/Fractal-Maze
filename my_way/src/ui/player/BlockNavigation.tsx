import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { blockDepthLimit } from '../../core/blockMaze/grid'
import { RecursiveBlockCanvas } from './RecursiveBlockCanvas'
import { TouchPad } from '../components/TouchPad'
import { CopyAddress } from '../components/CopyAddress'
import { SaveRouteButton } from '../replay/SaveRouteButton'
import { MazeCanvas } from '../components/MazeCanvas'
import { useRecursiveBlockSession } from './useRecursiveBlockSession'

export function BlockNavigation({ doc, depth }: { doc: RecursiveMazeDocument; depth: number }) {
  const { def, history, current, located, step, setStep, visibleDetail, setDetail, searchDetail, setSearchDetail,
    ready, won, markSaved, source, zoom, setZoom, solving, status, move, load, solve, reset, cancel } = useRecursiveBlockSession(doc, depth)
  return (
    <section>
      <p className="format-status">{won ? 'Finish reached' : 'Recursive maze'} · step {step} · depth {located?.address.length ?? 0} · detail {visibleDetail}</p>
      {current ? <>
        <CopyAddress address={located!.address.map(cell => `${cell % def.unit},${Math.floor(cell / def.unit)}`)} />
        <RecursiveBlockCanvas def={def} current={current} trail={history.states.slice(0, step + 1)} detail={visibleDetail} zoom={zoom} />
      </> : <MazeCanvas doc={doc} maxDepth={depth} />}
      <label><input type="checkbox" checked={zoom} onChange={event => setZoom(event.target.checked)} /> Zoom around player</label>
      <div className="button-row">
        <button className="control" onClick={() => { setZoom(true); setDetail(visibleDetail + 1) }}>Zoom deeper</button>
        <button className="control" disabled={visibleDetail <= (located?.address.length ?? 0) + 1} onClick={() => setDetail(visibleDetail - 1)}>Zoom out</button>
      </div>
      <TouchPad onDirection={move} disabled={!ready || won || solving} />
      <div className="button-row">
        <button className="control" disabled={!step || solving} onClick={() => setStep(step - 1)}>Undo</button>
        <button className="control" disabled={solving || step + 1 >= history.states.length} onClick={() => setStep(step + 1)}>Next step</button>
        <button className="control" disabled={solving} onClick={reset}>Restart</button>
        <label>Search detail <input className="control" aria-label="Search detail" type="number" min={1} max={blockDepthLimit(def.unit)} value={searchDetail}
          onChange={event => setSearchDetail(Math.max(1, Math.min(blockDepthLimit(def.unit), Math.trunc(Number(event.target.value)) || 1)))} /></label>
        <button className="control" disabled={!ready || solving} onClick={solve}>Find finite route</button>
        {solving && <button className="control" onClick={cancel}>Cancel search</button>}
        {def.providedRoute && <button className="control" disabled={solving} onClick={() => load(def.providedRoute!)}>Load supplied solution</button>}
        {ready && <SaveRouteButton onSaved={markSaved} maze={doc}
          route={{ type: 'fractalBlock', states: source === 'solver' ? history.states : history.states.slice(0, step + 1),
            details: source === 'solver' ? history.details : history.details.slice(0, step) }} source={source} complete={source === 'solver' || won} />}
      </div>
      <p role="status" className="format-note">{status}</p>
      {!ready && <p>Choose open start and goal base cells in Edit pattern to enable play.</p>}
      <p className="format-note">Black regions contain smaller copies. Zooming changes the view, not the maze or your run.
        Finite search supports detail up to {blockDepthLimit(def.unit)}; walking and zooming continue deeper.</p>
    </section>
  )
}
