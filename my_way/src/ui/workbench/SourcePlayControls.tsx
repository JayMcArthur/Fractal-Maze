import type { ReactNode } from 'react'
import type { DirectionBit } from '../../core/model/squareRecursive'
import { TouchPad } from '../components/TouchPad'

export function SourcePlayControls({
  notice,
  walking,
  playable,
  blocks,
  localView,
  onLocalViewChange,
  onDirection,
  controls,
  showInstructions = true,
}: {
  notice: string
  walking: boolean
  playable: boolean
  blocks: boolean
  localView: boolean
  onLocalViewChange: (local: boolean) => void
  onDirection: (direction: DirectionBit) => void
  controls?: ReactNode
  showInstructions?: boolean
}) {
  return (
    <>
      {(notice || showInstructions) && (
        <p className="source-route-help" aria-live="polite">
          {notice ||
            (playable
              ? blocks
                ? 'Arrows / WASD / IJKL move one block. Choose a direction at a junction, or click a route or gate.'
                : 'Arrows / WASD / IJKL follow the route and stop at junctions and gates. Choose a direction to continue, or click a route or gate.'
              : blocks
                ? 'Recorded movement follows the block corridors.'
                : 'Recorded movement follows the source routes.')}
        </p>
      )}
      {blocks && (
        <label className="source-display-style">
          <input
            type="checkbox"
            checked={localView}
            onChange={(event) => onLocalViewChange(event.target.checked)}
          />
          Local view
        </label>
      )}
      {playable && (
        <div className="source-movement-controls">
          <TouchPad onDirection={onDirection} disabled={walking} />
          {controls}
        </div>
      )}
    </>
  )
}
