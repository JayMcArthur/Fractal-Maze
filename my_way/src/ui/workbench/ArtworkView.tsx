import { TraceShape } from '../../core/render/svg/TraceShape'
import { CorridorArtwork } from '../../core/render/svg/CorridorArtwork'
import type { MazeArtwork } from '../../core/model/pathMaze'

import { assetUrl } from '../../core/io/assetUrl'
import { artworkDisplayGeometry } from '../../core/pathMaze/artworkDisplayGeometry'
export function ArtworkView({
  artwork,
  activePath,
}: {
  artwork: MazeArtwork
  activePath?: string
}) {
  const display = artworkDisplayGeometry(artwork)
  const width = display.bounds[2]
  return (
    <svg
      className="source-artwork"
      viewBox={display.bounds.join(' ')}
      role="img"
      aria-label="Original maze artwork and path traces"
    >
      {artwork.asset ? (
        <image href={assetUrl(artwork.asset)} width={display.width} height={display.height} />
      ) : (
        <CorridorArtwork artwork={artwork} bounds={display.bounds} />
      )}
      {artwork.traces
        .filter((trace) => trace.path === activePath)
        .map((trace) => (
          <g
            key={trace.id}
            fill="none"
            stroke="#eb6538"
            strokeWidth={width / 180}
            opacity={1}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <TraceShape trace={trace} />
          </g>
        ))}
    </svg>
  )
}
