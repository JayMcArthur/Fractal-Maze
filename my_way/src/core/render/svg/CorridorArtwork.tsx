import type { MazeArtwork } from '../../model/pathMaze'
import { TraceShape } from './TraceShape'

export function CorridorArtwork({
  artwork,
  bounds,
  depth = 0,
}: {
  artwork: MazeArtwork
  bounds: number[]
  depth?: number
}) {
  const room = artwork.views?.find((view) => view.bounds.every((value, i) => value === bounds[i]))
  const traces = room
    ? artwork.traces.filter((trace) => room.paths.includes(trace.path))
    : artwork.traces
  return (
    <g>
      <rect x={bounds[0]} y={bounds[1]} width={bounds[2]} height={bounds[3]} fill="#344c3a" />
      {[...new Set(traces.map((trace) => trace.path))].map((path) => (
        <g key={path} fill="none" strokeLinejoin="round" strokeLinecap="round">
          <g stroke="#344c3a" strokeWidth={bounds[2] / 55}>
            {traces
              .filter((trace) => trace.path === path)
              .map((trace) => (
                <TraceShape key={trace.id} trace={trace} />
              ))}
          </g>
          <g stroke="#eab350" strokeWidth={bounds[2] / 85}>
            {traces
              .filter((trace) => trace.path === path)
              .map((trace) => (
                <TraceShape key={trace.id} trace={trace} />
              ))}
          </g>
        </g>
      ))}
      {artwork.frames
        .filter(
          (frame) =>
            frame.x >= bounds[0] &&
            frame.y >= bounds[1] &&
            frame.x + frame.width <= bounds[0] + bounds[2] &&
            frame.y + frame.height <= bounds[1] + bounds[3]
        )
        .map((frame) => (
          <g key={frame.id}>
            <rect
              x={frame.x}
              y={frame.y}
              width={frame.width}
              height={frame.height}
              fill="#587761"
              stroke="#a6b99f"
              strokeWidth={bounds[2] / 400}
            />
            {depth < 2 && (
              <svg
                x={frame.x}
                y={frame.y}
                width={frame.width}
                height={frame.height}
                viewBox={bounds.join(' ')}
                preserveAspectRatio="none"
              >
                <CorridorArtwork artwork={artwork} bounds={bounds} depth={depth + 1} />
              </svg>
            )}
            {depth === 0 && (
              <text
                x={frame.x + frame.width / 2}
                y={frame.y + bounds[2] / 45}
                textAnchor="middle"
                fontSize={bounds[2] / 50}
                fill="white"
                stroke="#344c3a"
                strokeWidth={bounds[2] / 300}
                paintOrder="stroke"
              >
                {frame.id}
              </text>
            )}
          </g>
        ))}
    </g>
  )
}
