/**
 * Movement resolver for SquareRecursiveDefinition mazes.
 * Ported from Orelcosseron maze.py:keyPressEvent() logic.
 *
 * Given current PlayerPosition + direction, determines:
 *  - Regular move (within block level)
 *  - Teleport jump
 *  - Block entry (push block onto stack)
 *  - Block exit (pop block off stack)
 *  - Win condition check
 */
import type { SquareRecursiveDefinition, TileLink, TileExit } from '../../model/squareRecursive'
import type { PlayerPosition, PlayerAction } from '../../model/playerState'
import type { DirectionBit } from '../../model/squareRecursive'

const DIR_N: DirectionBit = 8
const DIR_E: DirectionBit = 4
const DIR_S: DirectionBit = 2
const DIR_W: DirectionBit = 1

function directionDelta(dir: DirectionBit): [number, number] {
  switch (dir) {
    case DIR_N:
      return [-1, 0]
    case DIR_S:
      return [1, 0]
    case DIR_E:
      return [0, 1]
    case DIR_W:
      return [0, -1]
    default:
      return [0, 0]
  }
}

/**
 * A link is entered by pressing the direction OPPOSITE to the exit's orientation.
 * e.g. exit faces North → link fires when pressing South.
 * Mirrors Orelcosseron tiles.py: setLink uses exit_tile.exitOrientation().opposite()
 */
function oppositeDirection(dir: DirectionBit): DirectionBit {
  switch (dir) {
    case DIR_N:
      return DIR_S
    case DIR_S:
      return DIR_N
    case DIR_E:
      return DIR_W
    case DIR_W:
      return DIR_E
    default:
      return dir
  }
}

function getCell(def: SquareRecursiveDefinition, row: number, col: number): number {
  if (row < 0 || row >= def.grid.rows || col < 0 || col >= def.grid.cols) return 0
  return def.grid.cells[row * def.grid.cols + col]
}

export interface MoveResult {
  action: PlayerAction
  newPos: PlayerPosition
  isWin: boolean
}

export function resolveMove(
  def: SquareRecursiveDefinition,
  pos: PlayerPosition,
  direction: DirectionBit,
  sessionStartMs: number
): MoveResult | null {
  const { row, col, blockStack } = pos
  const mask = getCell(def, row, col)
  const [dr, dc] = directionDelta(direction)
  const now = Date.now() - sessionStartMs

  // --- Check for teleporter ---
  const teleporter = def.teleporters.find(
    (t) => t.row === row && t.col === col && t.direction === direction
  )
  if (teleporter) {
    const newRow = row + dr * teleporter.reach
    const newCol = col + dc * teleporter.reach
    const newPos: PlayerPosition = { blockStack: [...blockStack], row: newRow, col: newCol }
    const action: PlayerAction = {
      type: 'teleport',
      from: pos,
      to: newPos,
      direction,
      timestamp: now,
    }
    return { action, newPos, isWin: checkWin(def, newPos) }
  }

  // --- Check for block entry (link at current cell) ---
  // A link fires when pressing the direction OPPOSITE to the exit's orientation.
  // Multiple links can share the same tile (different exits, different directions).
  for (const link of def.links.filter((l) => l.row === row && l.col === col)) {
    const exit = def.exits.find((e) => e.name === link.exitName)
    if (exit && oppositeDirection(exit.direction as DirectionBit) === direction) {
      const newBlockStack = [...blockStack, ...link.blockPath]
      const newPos: PlayerPosition = {
        blockStack: newBlockStack,
        row: exit.row,
        col: exit.col,
      }
      const action: PlayerAction = {
        type: 'enterBlock',
        from: pos,
        to: newPos,
        direction,
        blockName: link.blockPath[link.blockPath.length - 1],
        exitName: link.exitName,
        timestamp: now,
      }
      return { action, newPos, isWin: false }
    }
  }

  // --- Check for block exit (exit in this direction) ---
  const exitAtCurrent = def.exits.find(
    (e) => e.row === row && e.col === col && e.direction === direction
  )
  if (exitAtCurrent && blockStack.length > 1) {
    // We're in a block — check if this exit belongs to our current block
    const currentBlockName = blockStack[blockStack.length - 1]
    const link = def.links.find((l) => {
      if (l.exitName !== exitAtCurrent.name) return false
      if (l.blockPath[l.blockPath.length - 1] !== currentBlockName) return false
      if (l.blockPath.length > blockStack.length - 1) return false

      const stackSuffix = blockStack.slice(-l.blockPath.length)
      return l.blockPath.every((blockName, index) => blockName === stackSuffix[index])
    })
    if (link) {
      const newBlockStack = blockStack.slice(0, -link.blockPath.length)
      const newPos: PlayerPosition = { blockStack: newBlockStack, row: link.row, col: link.col }
      const action: PlayerAction = {
        type: 'exitBlock',
        from: pos,
        to: newPos,
        direction,
        blockName: currentBlockName,
        exitName: exitAtCurrent.name,
        timestamp: now,
      }
      return { action, newPos, isWin: checkWin(def, newPos) }
    }
  }

  // --- Check for top-level exit (win without trophies) ---
  if (exitAtCurrent && blockStack.length === 1 && def.trophies.length === 0) {
    const newPos: PlayerPosition = { blockStack: [...blockStack], row: row + dr, col: col + dc }
    const action: PlayerAction = {
      type: 'move',
      from: pos,
      to: newPos,
      direction,
      exitName: exitAtCurrent.name,
      timestamp: now,
    }
    return { action, newPos, isWin: true }
  }

  // --- Regular move (path bit set in this direction) ---
  if (mask & direction) {
    const newRow = row + dr
    const newCol = col + dc
    const newPos: PlayerPosition = { blockStack: [...blockStack], row: newRow, col: newCol }
    const action: PlayerAction = {
      type: 'move',
      from: pos,
      to: newPos,
      direction,
      timestamp: now,
    }
    // Check if new position is a trophy
    const isTrophy = def.trophies.some((t) => t.row === newRow && t.col === newCol)
    return { action, newPos, isWin: isTrophy && blockStack.length === 1 }
  }

  return null // No valid move
}

function checkWin(def: SquareRecursiveDefinition, pos: PlayerPosition): boolean {
  if (pos.blockStack.length !== 1) return false
  return def.trophies.some((t) => t.row === pos.row && t.col === pos.col)
}

export { directionDelta, getCell, DIR_N, DIR_E, DIR_S, DIR_W }
export type { TileLink, TileExit }
