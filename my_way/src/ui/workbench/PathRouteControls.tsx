import type { PathMazeDefinition, PathState } from '../../core/model/pathMaze'
import { pathMoveDescription } from '../../core/play/pathMovement'
import { availableMoves } from '../../core/pathMaze/traversal'

export function PathMoveChoices({
  model,
  current,
  busy,
  availableEdges,
  onMove,
}: {
  model: PathMazeDefinition
  current: PathState | undefined
  busy: boolean
  availableEdges?: readonly string[]
  onMove: (edge: string) => void
}) {
  if (!current) return null
  const moves = availableMoves(model, current)
  const choices = (
    <div className="witness-choices">
      {moves.map(({ edge }) => {
        const { action, path } = pathMoveDescription(model, current, edge)
        return (
          <button key={edge.id} className="control" disabled={busy || (availableEdges !== undefined && !availableEdges.includes(edge.id))} onClick={() => onMove(edge.id)}>
            {action === 'Finish' ? 'Finish maze' : `${action} → path ${path}`}
          </button>
        )
      })}
    </div>
  )
  return (
    moves.length > 8 ? (
      <details className="copy-crossing-choices">
        <summary>Copy crossings ({moves.length})</summary>
        {choices}
      </details>
    ) : choices
  )
}
