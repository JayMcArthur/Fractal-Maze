import { useEffect, useMemo, useRef } from 'react'
import type { BlockRecursiveDefinition } from '../../core/model/blockRecursive'
import type { RecursiveBlockPosition } from '../../core/blockMaze/recursivePosition'
import { recursiveBlockAddress } from '../../core/blockMaze/recursivePosition'
import { paintBlockOverview, paintBlockWindow } from '../../core/render/canvas/recursiveBlockScene'

export function RecursiveBlockCanvas({ def, current, trail = [], detail, zoom = true }: {
  def: BlockRecursiveDefinition
  current: RecursiveBlockPosition
  trail?: RecursiveBlockPosition[]
  detail: number
  zoom?: boolean
}) {
  const ref = useRef<HTMLCanvasElement>(null), overview = useRef<HTMLCanvasElement>(null)
  const address = useMemo(() => recursiveBlockAddress(def, current)!.address, [def, current])
  const visibleDetail = Math.max(detail, address.length + 1)
  useEffect(() => {
    if (zoom) paintBlockWindow(ref.current!, def, current, trail, visibleDetail)
    else paintBlockOverview(ref.current!, def, current)
    if (overview.current) paintBlockOverview(overview.current, def, current, address)
  }, [def, current, trail, zoom, visibleDetail, address])
  return (
    <div className="block-view">
      <canvas ref={ref} className="block-route-canvas" aria-label={`Recursive block maze at detail ${visibleDetail}`} />
      {zoom && <figure className="block-overview">
        <canvas ref={overview} aria-label="Whole maze and current view" />
        <figcaption>{address.length > 1 ? `Parent copy · depth ${address.length - 1}` : 'Whole maze · your position and copy'}</figcaption>
      </figure>}
    </div>
  )
}
