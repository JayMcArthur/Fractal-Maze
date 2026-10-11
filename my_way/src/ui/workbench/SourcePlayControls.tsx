import type { ReactNode } from 'react'
import type { DirectionBit } from '../../core/model/squareRecursive'
import { TouchPad } from '../components/TouchPad'

export function SourcePlayControls({
  notice,
  walking,
  playable,
  canChangeLayout,
  blocks,
  sourceAsset,
  localView,
  onStyleChange,
  onLocalViewChange,
  onDirection,
  controls,
}: {
  notice: string
  walking: boolean
  playable: boolean
  canChangeLayout: boolean
  blocks: boolean
  sourceAsset: string
  localView: boolean
  onStyleChange: (blocks: boolean) => void
  onLocalViewChange: (local: boolean) => void
  onDirection: (direction: DirectionBit) => void
  controls?: ReactNode
}) {
  return (
    <>
      <p className="source-route-help" aria-live="polite">
        {notice ||
          (playable
            ? blocks
              ? 'Arrows / WASD / IJKL move one block. Choose a direction at a junction, or click a route or gate.'
              : 'Arrows / WASD / IJKL follow the route and stop at junctions and gates. Choose a direction to continue, or click a route or gate.'
            : canChangeLayout
              ? 'Finish reached. Undo a move or restart to continue.'
            : blocks
              ? 'Recorded movement follows the block corridors.'
              : 'Recorded movement follows the source routes.')}
      </p>
      {canChangeLayout && sourceAsset && (
        <label className="source-display-style">
          Display{' '}
          <select
            className="control"
            aria-label="Display style"
            value={blocks ? 'corridors' : 'source'}
            disabled={walking}
            onChange={(event) => onStyleChange(event.target.value === 'corridors')}
          >
            <option value="source">Source drawing</option>
            <option value="corridors">Block remake</option>
          </select>
        </label>
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
