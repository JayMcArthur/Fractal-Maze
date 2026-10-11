import type { PointerEvent } from 'react'
import type { MazeArtwork, PathMazeDefinition, PathState } from '../../core/model/pathMaze'
import type { ArtworkPoint } from '../../core/pathMaze/artworkRoutes'
import type { availableMoves } from '../../core/pathMaze/traversal'
import { assetUrl } from '../../core/io/assetUrl'
import { pathMoveDescription } from '../../core/play/pathMovement'
import { TraceShape } from '../../core/render/svg/TraceShape'
import { BlockArtwork } from '../../core/render/svg/BlockArtwork'
import { PathLocationMap } from './PathLocationMap'
import { copyAddress } from '../../core/pathMaze/copyAddress'

/** Draw the active room and its position within the parent; movement is owned by the canvas. */
export function SourceRouteDrawing({
  artwork,
  model,
  marker,
  bounds,
  display,
  corridors,
  moves,
  onMove,
  onPointerDown,
  camera,
}: {
  artwork: MazeArtwork
  model: PathMazeDefinition
  marker: { state: PathState; point: ArtworkPoint }
  bounds: number[]
  display: Pick<MazeArtwork, 'width' | 'height' | 'bounds'>
  corridors: boolean
  moves: ReturnType<typeof availableMoves>
  onMove?: (edge: string) => void
  onPointerDown: (event: PointerEvent<SVGSVGElement>) => void
  camera?: number[]
}) {
  const width = bounds[2]
  const cell = artwork.blockSize
  const active = artwork.traces.filter((trace) => trace.path === marker.state.path)
  const goal =
    model.goal && copyAddress(model, model.goal).join('\0') === copyAddress(model, marker.state).join('\0')
      ? artwork.goal
      : undefined
  const start =
    model.start && copyAddress(model, model.start).join('\0') === copyAddress(model, marker.state).join('\0')
      ? artwork.start
      : undefined
  return (
    <>
      <svg
        className="source-artwork"
        viewBox={(camera ?? bounds).join(' ')}
        role="img"
        aria-label="Playable source maze routes"
        onPointerDown={onPointerDown}
        style={cell ? { background: '#344c3a' } : undefined}
      >
        {corridors ? (
          <BlockArtwork artwork={artwork} bounds={bounds} />
        ) : (
          <image href={assetUrl(artwork.asset)} width={display.width} height={display.height} />
        )}
        {active.map((trace) => (
          <g key={trace.id} fill="none" stroke="#ef8634" strokeWidth={cell ? cell * .16 : width / 220} opacity="0.5">
            <TraceShape trace={trace} />
          </g>
        ))}
        {moves.map(({ edge }) => {
          const gate = artwork.gates?.find((gate) => gate.edge === edge.id)
          const { action, path: pathLabel } = pathMoveDescription(model, marker.state, edge)
          return (
            gate && (
              <g
                key={edge.id}
                className="source-gate"
                role="button"
                tabIndex={0}
                aria-label={action === 'Finish' ? 'Finish maze' : `${action} to path ${pathLabel}`}
                onClick={() => onMove?.(edge.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onMove?.(edge.id)
                  }
                }}
              >
                <circle cx={gate.from[0]} cy={gate.from[1]} r={cell ? cell * .5 : width / 65} fill="transparent" />
                <circle
                  cx={gate.from[0]}
                  cy={gate.from[1]}
                  r={artwork.blockSize ? artwork.blockSize * .24 : width / 140}
                  fill="#ffffff"
                  stroke="#21665e"
                  strokeWidth={cell ? cell * .06 : width / 500}
                />
                <title>
                  {action} → path {pathLabel}
                </title>
              </g>
            )
          )
        })}
        <circle
          data-testid="source-player-marker"
          cx={marker.point[0]}
          cy={marker.point[1]}
          r={artwork.blockSize ? artwork.blockSize * .28 : width / 110}
          fill="#172f3a"
          stroke="#fff"
          strokeWidth={artwork.blockSize ? artwork.blockSize * .08 : width / 400}
          pointerEvents="none"
        />
        {[
          { label: 'Start', point: start },
          { label: 'Finish', point: goal },
        ].map(
          ({ label, point }) =>
            point && (
              <g key={label} pointerEvents="none">
                <circle
                  cx={point[0]}
                  cy={point[1]}
                  r={cell ? cell * .36 : width / 100}
                  fill="none"
                  stroke={label === 'Finish' ? '#9e4511' : '#21665e'}
                  strokeWidth={cell ? cell * .06 : width / 500}
                />
                <text
                  x={point[0]}
                  y={point[1] + (cell ? cell * .95 : width / 35)}
                  textAnchor="middle"
                  fontSize={cell ? cell * .7 : width / 45}
                  fill="#172f3a"
                  stroke="white"
                  strokeWidth={cell ? cell * .06 : width / 250}
                  paintOrder="stroke"
                >
                  {label}
                </text>
              </g>
            )
        )}
      </svg>
      <PathLocationMap model={model} artwork={artwork} marker={marker} bounds={bounds} display={display}
        blocks={corridors} camera={camera} />
    </>
  )
}
