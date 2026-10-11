import type { MazeArtwork, PathMazeDefinition } from '../../core/model/pathMaze'
import { copyAddress } from '../../core/pathMaze/copyAddress'
import type { PathPosition } from '../../core/play/pathGeometry'
import { BlockArtwork } from '../../core/render/svg/BlockArtwork'
import { assetUrl } from '../../core/io/assetUrl'

export function PathLocationMap({ model, artwork, marker, bounds, display, blocks, camera }: {
  model: PathMazeDefinition
  artwork: MazeArtwork
  marker: PathPosition
  bounds: number[]
  display: Pick<MazeArtwork, 'width' | 'height' | 'bounds'>
  blocks: boolean
  camera?: number[]
}) {
  const parent = artwork.frames.find(frame => frame.id === copyAddress(model, marker.state).at(-1))
  if (!parent && !camera) return null
  const highlight = parent ?? { x: camera![0], y: camera![1], width: camera![2], height: camera![3] }
  const point = parent ? [
    parent.x + ((marker.point[0] - bounds[0]) / bounds[2]) * parent.width,
    parent.y + ((marker.point[1] - bounds[1]) / bounds[3]) * parent.height,
  ] : marker.point
  const visible = camera ?? bounds
  const onLeft = marker.point[0] > visible[0] + visible[2] / 2
  return (
    <figure className="source-parent-view" style={onLeft ? { left: 8, right: 'auto' } : undefined}>
      <svg viewBox={display.bounds.join(' ')} role="img"
        aria-label={parent ? 'Your location inside the parent copy' : 'Whole maze and your current position'}>
        {blocks ? <BlockArtwork artwork={artwork} bounds={display.bounds} /> :
          <image href={assetUrl(artwork.asset)} width={display.width} height={display.height} />}
        <rect x={highlight.x} y={highlight.y} width={highlight.width} height={highlight.height}
          fill="none" stroke="#21665e" strokeWidth={display.bounds[2] / 60} />
        <circle data-testid={parent ? 'parent-player-marker' : 'overview-player-marker'}
          cx={point[0]} cy={point[1]} r={display.bounds[2] / 40} fill="#172f3a"
          stroke="white" strokeWidth={display.bounds[2] / 160} />
      </svg>
      <figcaption>{parent ? `Inside ${parent.id}` : 'Whole maze'}</figcaption>
    </figure>
  )
}
