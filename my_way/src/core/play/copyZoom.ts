import type { CopyFrame, MazeArtwork, PathMazeDefinition } from '../model/pathMaze'
import { copyAddress } from '../pathMaze/copyAddress'
import { artworkDisplayGeometry } from '../pathMaze/artworkDisplayGeometry'
import { blockCamera } from './blockArtwork'
import type { PathPosition } from './pathGeometry'

type Rectangle = [number, number, number, number]

/** Display-only parent/child mapping. A proof jump or room substitution has no copy camera. */
export function copyZoom(
  artwork: MazeArtwork,
  model: PathMazeDefinition,
  from: PathPosition,
  to: PathPosition,
  local: boolean
) {
  const before = copyAddress(model, from.state),
    after = copyAddress(model, to.state)
  const entering = after.length === before.length + 1 && before.every((id, i) => id === after[i])
  const exiting = before.length === after.length + 1 && after.every((id, i) => id === before[i])
  if (!entering && !exiting) return null
  const copy = (entering ? after : before).at(-1)!
  const frame = artwork.frames.find((frame) => frame.id === copy)
  if (!frame) return null
  const source = roomBounds(artwork, from.state.path),
    target = roomBounds(artwork, to.state.path)
  const parent = entering ? source : target
  if (
    frame.x < parent[0] ||
    frame.y < parent[1] ||
    frame.x + frame.width > parent[0] + parent[2] ||
    frame.y + frame.height > parent[1] + parent[3]
  )
    return null
  const sourceView = view(artwork, source, from, local),
    targetView = view(artwork, target, to, local)
  if (entering)
    return {
      copy,
      marker: from,
      from: sourceView,
      to: project(targetView, target, frame),
      markerTo: projectPoint(to.point, target, frame),
    }
  const point = projectPoint(from.point, source, frame)
  return {
    copy,
    marker: { state: to.state, point },
    from: project(sourceView, source, frame),
    to: targetView,
    markerTo: to.point,
  }
}

function projectPoint(
  point: [number, number],
  bounds: Rectangle,
  frame: CopyFrame
): [number, number] {
  const projected = project([point[0], point[1], 0, 0], bounds, frame)
  return [projected[0], projected[1]]
}
function roomBounds(artwork: MazeArtwork, path: string): Rectangle {
  return (
    artwork.views?.find((view) => view.paths.includes(path))?.bounds ??
    artworkDisplayGeometry(artwork).bounds
  )
}
function view(
  artwork: MazeArtwork,
  bounds: Rectangle,
  position: PathPosition,
  local: boolean
): Rectangle {
  return local && artwork.blockSize
    ? (blockCamera(bounds, position.point, artwork.blockSize) as Rectangle)
    : bounds
}
function project(rect: Rectangle, bounds: Rectangle, frame: CopyFrame): Rectangle {
  return [
    frame.x + ((rect[0] - bounds[0]) * frame.width) / bounds[2],
    frame.y + ((rect[1] - bounds[1]) * frame.height) / bounds[3],
    (rect[2] * frame.width) / bounds[2],
    (rect[3] * frame.height) / bounds[3],
  ]
}
