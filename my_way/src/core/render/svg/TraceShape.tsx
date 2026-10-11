import type { ArtworkTrace } from '../../model/pathMaze'

export function TraceShape({ trace }: { trace: ArtworkTrace }) {
  return trace.svg ? (
    <path d={trace.svg.d} transform={`matrix(${trace.svg.matrix.join(' ')})`} />
  ) : (
    <polyline points={trace.points.map((point) => point.join(',')).join(' ')} />
  )
}
