import type { MazeArtwork, PathMazeDefinition } from '../../core/model/pathMaze'
import { distance } from '../../core/pathMaze/artworkRoutes'

/** Name each visible corridor using the same label as the starting-line selectors. */
export function ProofLineLabels({ artwork, model, current, bounds, camera }: {
  artwork: MazeArtwork
  model: PathMazeDefinition
  current: string
  bounds: number[]
  camera: number[]
}) {
  const room = artwork.views?.find(view => view.bounds.every((value, i) => value === bounds[i]))
  const font = Math.max(camera[2] / 32, camera[3] / 20)
  const placed: { x: number; y: number; width: number }[] = []
  return (
    <g className="proof-line-labels" pointerEvents="none">
      {model.paths.filter(path => !room || room.paths.includes(path.id)).map(path => {
        const segments = artwork.traces.filter(trace => trace.path === path.id).flatMap(trace =>
          trace.points.slice(1).map((to, i) => ({ from: trace.points[i], to }))
        )
        const label = `Line ${path.label}`
        const width = font * (label.length * .62 + .8)
        const candidates = segments
          .sort((a, b) => distance(b.from, b.to) - distance(a.from, a.to))
          .flatMap(({ from, to }) => [.5, .25, .75].map(t => ({
            x: from[0] + (to[0] - from[0]) * t,
            y: from[1] + (to[1] - from[1]) * t,
            width,
          })))
          .filter(({ x, y }) => x - width / 2 >= camera[0] &&
            x + width / 2 <= camera[0] + camera[2] && y - font >= camera[1] &&
            y + font <= camera[1] + camera[3])
        const point = candidates.find(candidate => placed.every(other =>
          Math.abs(candidate.x - other.x) > (width + other.width) / 2 + font * .2 ||
          Math.abs(candidate.y - other.y) > font * 1.9
        )) ?? candidates[0]
        if (!point) return null
        placed.push(point)
        const { x, y } = point
        const active = path.id === current
        return (
          <g key={path.id} className="proof-line-label" data-path={path.id} data-current={active}
            transform={`translate(${x} ${y})`} role="img"
            aria-label={`${label}${active ? ', current line' : ''}`}>
            <rect x={-width / 2} y={-font * .85} width={width} height={font * 1.7}
              rx={font * .4} fill={active ? '#2967be' : '#f9faf6'}
              stroke={active ? '#fff' : '#344c3a'} strokeWidth={font * .1} />
            <text textAnchor="middle" dy=".35em" fontSize={font} fontWeight="700"
              fill={active ? '#fff' : '#172f3a'}>{label}</text>
          </g>
        )
      })}
    </g>
  )
}
