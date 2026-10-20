import { useMemo, useState } from 'react'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { BlockRecursiveDefinition } from '../../core/model/blockRecursive'
import type { NativeRoute } from '../../core/replay/nativeReplay'
import { gridBlockPosition, recursiveBlockAddress, recursiveBlockWon } from '../../core/blockMaze/recursivePosition'
import { RecursiveBlockCanvas } from '../player/RecursiveBlockCanvas'

export function BlockReplay({
  maze,
  route,
  step,
}: {
  maze: RecursiveMazeDocument
  route: Extract<NativeRoute, { type: 'blockRecursive' | 'fractalBlock' }>
  step: number
}) {
  const def = maze.definition as BlockRecursiveDefinition
  const states = useMemo(
    () => route.type === 'fractalBlock' ? route.states : route.states.map(cell => gridBlockPosition(def.unit, cell, route.depth)),
    [def.unit, route]
  )
  const [zoom, setZoom] = useState(true),
    current = states[step]
  const depth = recursiveBlockAddress(def, current)!.address.length
  const detail = route.type === 'fractalBlock' ? route.details[Math.max(0, step - 1)] ?? Math.max(current.x.digits.length, current.y.digits.length) : route.depth
  return (
    <>
      <p className="format-status">
        {recursiveBlockWon(def, current) ? 'Finish reached · ' : ''}Depth {depth} · detail {detail}
      </p>
      <RecursiveBlockCanvas
        def={def}
        current={current}
        trail={states.slice(0, step + 1)}
        detail={detail}
        zoom={zoom}
      />
      <label>
        <input type="checkbox" checked={zoom} onChange={(event) => setZoom(event.target.checked)} />{' '}
        Zoom around player
      </label>
    </>
  )
}
