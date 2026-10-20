import { memo, useId } from 'react'
import type { MazeArtwork } from '../../model/pathMaze'

/** Orthogonal floor cells, separated wire crossings, and nested copies share one static scene. */
export const BlockArtwork = memo(function BlockArtwork({ artwork, bounds }: {
  artwork: MazeArtwork
  bounds: number[]
}) {
  const id = useId()
  return (
    <g className="block-maze-artwork" data-cell-size={artwork.blockSize}>
      <defs>
        <g id={`${id}-deep`}><BlockArtworkLayer artwork={artwork} bounds={bounds} /></g>
        <g id={`${id}-child`}><BlockArtworkLayer artwork={artwork} bounds={bounds} nested={`${id}-deep`} /></g>
      </defs>
      <BlockArtworkLayer artwork={artwork} bounds={bounds} nested={`${id}-child`} labels />
    </g>
  )
})

function BlockArtworkLayer({ artwork, bounds, nested, labels = false }: {
  artwork: MazeArtwork
  bounds: number[]
  nested?: string
  labels?: boolean
}) {
  const cell = artwork.blockSize!
  const room = artwork.views?.find(view => view.bounds.every((value, i) => value === bounds[i]))
  const traces = room ? artwork.traces.filter(trace => room.paths.includes(trace.path)) : artwork.traces
  return (
    <g>
      <rect x={bounds[0]} y={bounds[1]} width={bounds[2]} height={bounds[3]} fill="#344c3a" />
      {[...new Set(traces.map(trace => trace.path))].map(path => (
        <g key={path} fill="none" strokeLinejoin="miter" strokeLinecap="square">
          {[{ color: '#344c3a', width: cell * 1.12 }, { color: '#eab350', width: cell * .82 }].map(stroke => (
            <g key={stroke.color} stroke={stroke.color} strokeWidth={stroke.width}>
              {traces.filter(trace => trace.path === path).map(trace => (
                <polyline key={trace.id} points={trace.points.map(point => point.join(',')).join(' ')} />
              ))}
            </g>
          ))}
          {traces.filter(trace => trace.path === path && trace.directed).flatMap(trace =>
            trace.points.slice(1).map((point, i) => {
              const from = trace.points[i]
              if (Math.hypot(point[0] - from[0], point[1] - from[1]) < cell * 2) return null
              const angle = Math.atan2(point[1] - from[1], point[0] - from[0]) * 180 / Math.PI
              return <path key={`${trace.id}-${i}`} d={`M ${-cell * .18} ${-cell * .16} L ${cell * .18} 0 L ${-cell * .18} ${cell * .16}`}
                transform={`translate(${(point[0] + from[0]) / 2} ${(point[1] + from[1]) / 2}) rotate(${angle})`}
                stroke="#765321" strokeWidth={cell * .12} />
            })
          )}
        </g>
      ))}
      {artwork.frames.filter(frame => frame.x >= bounds[0] && frame.y >= bounds[1] &&
        frame.x + frame.width <= bounds[0] + bounds[2] && frame.y + frame.height <= bounds[1] + bounds[3])
        .map(frame => (
          <g key={frame.id}>
            <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height}
              fill="#587761" stroke="#a6b99f" strokeWidth={cell * .14} />
            {nested && <svg x={frame.x} y={frame.y} width={frame.width} height={frame.height}
              viewBox={bounds.join(' ')} preserveAspectRatio="none">
              <use href={`#${nested}`} />
            </svg>}
            {labels && <text x={frame.x + frame.width / 2} y={frame.y + cell * 1.5}
              textAnchor="middle" fontSize={cell * 1.2} fill="white" stroke="#344c3a"
              strokeWidth={cell * .2} paintOrder="stroke">{frame.id}</text>}
          </g>
        ))}
    </g>
  )
}
