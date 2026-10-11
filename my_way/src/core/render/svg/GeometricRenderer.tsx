import type { GeometricMaze } from '../../model/geometricRecursive'
import { geometricGates, geometricWidth, geometricSubWidth } from '../../model/geometricRecursive'

interface Props { maze: GeometricMaze; detail?: number }

export function GeometricRenderer({ maze, detail = 0 }: Props) {
  const width = geometricWidth(maze.size)
  const subWidth = geometricSubWidth(maze.size)
  const paths = maze.paths.map((path, index) => <path key={index} fill={path.color}
    d={path.points.filter((point) => !point.isHead).map((point) => `M${point.x} ${point.y}h1v1h-1z`).join('')} />)
  return <svg viewBox={`-1 -1 ${width + 2} ${width + 2}`} role="img" aria-label={maze.name} className="geometric-maze">
    <rect width={width} height={width} fill="white" />
    {maze.subMazes.map((sub) => <g key={sub.id}>
      <rect x={sub.x} y={sub.y} width={subWidth} height={subWidth} fill="#aaa" />
      {detail > 0 ? <svg x={sub.x} y={sub.y} width={subWidth} height={subWidth} viewBox={`0 0 ${width} ${width}`}>
        <GeometricRenderer maze={maze} detail={detail - 1} />
      </svg> : <text x={sub.x + subWidth / 2} y={sub.y + subWidth / 2} fontSize="5" textAnchor="middle" dominantBaseline="central">{sub.id}</text>}
    </g>)}
    {[maze.startingPoint, maze.finish].map((point) => point && <g key={point.id}>
      <rect x={point.x} y={point.y} width="5" height="5" fill="black" />
      <text x={point.x + 2.5} y={point.y + 2.5} fill="white" fontSize="3" textAnchor="middle" dominantBaseline="central">{point.id.toUpperCase()}</text>
    </g>)}
    {geometricGates(maze).map((gate) => <rect key={gate.id} x={gate.x} y={gate.y} width={gate.width} height={gate.width} fill="black" />)}
    {paths}
  </svg>
}
