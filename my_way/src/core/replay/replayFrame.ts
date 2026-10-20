import type { PlayerPosition } from '../model/playerState'
import type { ReplayDocument } from './ReplayDocument'
import type { SquareRecursiveDefinition } from '../model/squareRecursive'

export function samePosition(a: PlayerPosition, b: PlayerPosition): boolean {
  return (
    a.row === b.row &&
    a.col === b.col &&
    a.blockStack.length === b.blockStack.length &&
    a.blockStack.every((name, index) => name === b.blockStack[index])
  )
}

export function appendTrail(trail: PlayerPosition[], position: PlayerPosition): PlayerPosition[] {
  const index = trail.findIndex((point) => samePosition(point, position))
  return index < 0 ? [...trail, position] : trail.slice(0, index + 1)
}

/** Frame zero is the start; frame n has applied exactly n recorded actions. */
export function replayFrame(doc: ReplayDocument, step: number) {
  const def = doc.maze.definition as SquareRecursiveDefinition
  const start = doc.actions[0]?.from ?? {
    blockStack: ['0'],
    row: def.player?.row ?? 0,
    col: def.player?.col ?? 0,
  }
  let trail = [start]
  let position = start
  for (const action of doc.actions.slice(0, step)) {
    position = action.to
    trail = appendTrail(trail, position)
  }
  return { currentPosition: position, trail }
}
