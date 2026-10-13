import type { MazeArtwork, PathMazeDefinition, PathState } from '../../core/model/pathMaze'
import { stateLabel } from '../../core/pathMaze/traversal'
import { ArtworkView } from './ArtworkView'
import { SourceRouteCanvas } from './SourceRouteCanvas'
import type { ReactNode } from 'react'
import type { ArtworkPoint } from '../../core/pathMaze/artworkRoutes'
import type { PathPlayFrame } from '../../core/play/pathSession'

export function PathMazeDrawing({
  model,
  artwork,
  blockArtwork,
  busy,
  current,
  arrivalEdges,
  onMove,
  onMotionChange,
  onVisibleStateChange,
  animationMs,
  controls,
  onWalk,
  motionPaused,
  onArtworkChange,
  frame,
}: {
  model: PathMazeDefinition
  artwork?: MazeArtwork
  blockArtwork?: MazeArtwork
  busy?: boolean
  current?: PathState
  arrivalEdges?: string[]
  onMove?: (edge: string) => void
  onMotionChange?: (moving: boolean) => void
  onVisibleStateChange?: (state: PathState) => void
  animationMs?: number
  controls?: ReactNode
  onWalk?: (points: ArtworkPoint[]) => void
  frame?: PathPlayFrame
  motionPaused?: boolean
  onArtworkChange?: (artwork: MazeArtwork) => void
}) {
  const physical = artwork && current &&
    (artwork.gates?.length || artwork.blockSize) &&
    artwork.traces.some(trace => trace.path === current.path)
  return (
    <>
      {physical ? (
        <SourceRouteCanvas
          artwork={artwork}
          blockArtwork={blockArtwork}
          busy={busy}
          model={model}
          current={current}
          arrivalEdges={arrivalEdges}
          onMove={onMove}
          onMotionChange={onMotionChange}
          onVisibleStateChange={onVisibleStateChange}
          animationMs={animationMs}
          controls={controls}
          onWalk={onWalk}
          onArtworkChange={onArtworkChange}
          motionPaused={motionPaused}
          frame={frame}
        />
      ) : artwork ? (
        <ArtworkView artwork={artwork} activePath={current?.path} />
      ) : (
        <div className="path-state-map">
          {model.paths.map((path) => (
            <span
              key={path.id}
              className={path.id === current?.path ? 'is-current' : ''}
              style={{ borderColor: path.color }}
            >
              Path {path.label}
              {path.helper && ' · helper'}
            </span>
          ))}
        </div>
      )}
      {!physical && controls}
      {current && (
        <p className="path-state-caption">
          Address: {stateLabel(current, model)}.{' '}
          {model.paths.find((path) => path.id === current.path)?.helper
            ? 'Explicit helper state.'
            : ''}
        </p>
      )}
    </>
  )
}
