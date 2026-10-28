import type { PathMazeDefinition, PathState } from '../../core/model/pathMaze'
import { sameState, stateKey } from '../../core/pathMaze/traversal'
import { copyAddress } from '../../core/pathMaze/copyAddress'
import type { availableProofMoves, CheckedProofStep } from '../../core/play/proofMovement'
import { CopyAddress } from '../components/CopyAddress'

export function PathProofChoices({
  model,
  current,
  moves,
  busy,
  onMove,
}: {
  model: PathMazeDefinition
  current: PathState | undefined
  moves: ReturnType<typeof availableProofMoves>
  busy: boolean
  onMove: (step: CheckedProofStep) => void
}) {
  const destinations = new Set<string>()
  const connections = moves.filter(({ position }) => {
    const key = stateKey(position.state)
    if (destinations.has(key)) return false
    destinations.add(key)
    return true
  })
  if (!current || !connections.length) return null
  return (
    <div className="witness-choices" aria-label="Checked proof connections">
      {connections.map(({ move, position }) => (
        <button
          className="control"
          key={`${move.step.reference}:${move.step.reverse}`}
          disabled={busy}
          onClick={() => onMove(move.step)}
        >
          Follow → Line {model.paths.find((path) => path.id === position.state.path)?.label}
          {!sameState({ ...current, path: position.state.path }, position.state) && (
            <>
              {' '}
              · <CopyAddress address={copyAddress(model, position.state)} />
            </>
          )}
        </button>
      ))}
    </div>
  )
}
