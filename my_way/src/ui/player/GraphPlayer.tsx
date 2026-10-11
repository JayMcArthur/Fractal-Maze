import { useRunGuard } from './useRunGuard'
import { useState } from 'react'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { GraphLabeledDefinition } from '../../core/model/graphLabeled'
import { graphChoices, graphPortals } from '../../core/solver/common/graphTraversal'
import { GraphLabeledRenderer } from '../../core/render/svg/GraphLabeledRenderer'

export function GraphPlayer({ doc }: { doc: RecursiveMazeDocument }) {
  const def = doc.definition as GraphLabeledDefinition
  const [history, setHistory] = useState([def.entryPortal])
  const current = history.at(-1)!
  const choices = current === def.exitPortal ? [] : graphChoices(def, current)
  useRunGuard(history.length > 1 && current !== def.exitPortal, history)

  const labels = new Map(graphPortals(def.root).map((portal) => [portal.id, portal.label]))
  const move = (id: string) => {
    if (choices.includes(id)) setHistory([...history, id])
  }
  return (
    <>
      <p className="format-status" role="status">
        {current === def.exitPortal ? 'Exit reached' : `At ${labels.get(current)}`} ·{' '}
        {history.length - 1} connections traversed
      </p>
      <div className="format-field">
        <GraphLabeledRenderer doc={doc} current={current} onPortal={move} />
      </div>
      <div className="button-row">
        <button
          className="control"
          disabled={history.length < 2}
          onClick={() => setHistory(history.slice(0, -1))}
        >
          Undo connection
        </button>
        <button className="control" onClick={() => setHistory([def.entryPortal])}>
          Restart
        </button>
        {choices.map((id) => (
          <button key={id} className="control" onClick={() => move(id)}>
            Move to {labels.get(id)}
          </button>
        ))}
      </div>
      <p className="format-note">
        Lines are declared portal connections. Arrows permit travel in their direction; plain lines
        permit both directions. Nested node membership does not create an extra connection.
      </p>
    </>
  )
}
