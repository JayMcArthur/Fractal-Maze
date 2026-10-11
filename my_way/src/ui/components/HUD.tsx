import type { PlayerPosition } from '../../core/model/playerState'
import { CopyAddress } from './CopyAddress'

interface HUDProps {
  position: PlayerPosition
  moveCount: number
  elapsedMs: number
  isWon: boolean
  bestMoves?: number
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function HUD({ position, moveCount, elapsedMs, isWon, bestMoves }: HUDProps) {
  const depth = position.blockStack.length - 1

  return (
    <section className="digital-hud" aria-label="Maze position and session status">
      <div className="digital-hud__position">
        <span className={`status-lamp ${isWon ? 'is-won' : ''}`} aria-hidden="true" />
        <div>
          <small>Current position</small>
          <CopyAddress address={position.blockStack.slice(1)} />
        </div>
      </div>
      <dl className="digital-hud__metrics">
        <div>
          <dt>Depth</dt>
          <dd>{depth}</dd>
        </div>
        <div>
          <dt>Cell</dt>
          <dd>
            {position.col}:{position.row}
          </dd>
        </div>
        <div>
          <dt>Moves</dt>
          <dd>{moveCount}</dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatDuration(elapsedMs)}</dd>
        </div>
        {bestMoves !== undefined && (
          <div>
            <dt>Best</dt>
            <dd>{bestMoves}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
