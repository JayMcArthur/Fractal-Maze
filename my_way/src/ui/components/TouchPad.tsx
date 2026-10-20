import type { DirectionBit } from '../../core/model/squareRecursive'

interface TouchPadProps {
  onDirection: (dir: DirectionBit) => void
  disabled?: boolean
}

const DIRECTIONS: Array<{ direction: DirectionBit; arrow: string; label: string }> = [
  { direction: 1, arrow: '←', label: 'Move west' },
  { direction: 8, arrow: '↑', label: 'Move north' },
  { direction: 2, arrow: '↓', label: 'Move south' },
  { direction: 4, arrow: '→', label: 'Move east' },
]

export function TouchPad({ onDirection, disabled }: TouchPadProps) {
  return <div className="maze-pad" role="group" aria-label="Movement controls">
    {DIRECTIONS.map(({ direction, arrow, label }) => <button
      key={direction} className="maze-pad-key" disabled={disabled}
      onClick={() => onDirection(direction)} aria-label={label}
    >{arrow}</button>)}
  </div>
}
