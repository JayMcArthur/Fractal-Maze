import { useLayoutEffect, useRef } from 'react'
import type { ArtworkPoint } from '../../core/pathMaze/artworkRoutes'

/** Keep the dot's actual screen size while the copy camera changes aspect ratio and scale. */
export function PlayerMarker({
  point,
  radius,
  stroke,
  camera,
  zooming,
}: {
  point: ArtworkPoint
  radius: number
  stroke: number
  camera?: number[]
  zooming: boolean
}) {
  const marker = useRef<SVGCircleElement>(null)
  const pixels = useRef<{ radius: number; stroke: number } | null>(null)
  useLayoutEffect(() => {
    const node = marker.current
    const scale = node?.getScreenCTM()?.a
    if (!node || !scale) return
    if (!zooming || !pixels.current)
      pixels.current = { radius: radius * scale, stroke: stroke * scale }
    node.setAttribute('r', String(zooming ? pixels.current.radius / scale : radius))
    node.setAttribute('stroke-width', String(zooming ? pixels.current.stroke / scale : stroke))
  }, [camera, radius, stroke, zooming])
  return (
    <circle
      ref={marker}
      data-testid="source-player-marker"
      cx={point[0]}
      cy={point[1]}
      r={radius}
      fill="#172f3a"
      stroke="#fff"
      strokeWidth={stroke}
      pointerEvents="none"
    />
  )
}
