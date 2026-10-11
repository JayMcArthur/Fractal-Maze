// Borrowing: Orel block_stack, XOR visited state, Rim zoom pattern
import type { DirectionBit } from './squareRecursive'

export interface PlayerPosition {
  blockStack: string[] // ['0'] = top level, ['0','A','B'] = nested 2 deep
  row: number
  col: number
}

export type PlayerActionType =
  | 'move' // step within a block level
  | 'enterBlock' // push block onto stack
  | 'exitBlock' // pop block off stack
  | 'teleport' // jump across tiles
  | 'solverStep' // solver-generated move
  | 'checkpoint' // user-set bookmark
  | 'annotation' // user note

export interface PlayerAction {
  type: PlayerActionType
  from: PlayerPosition
  to: PlayerPosition
  direction?: DirectionBit
  blockName?: string
  exitName?: string
  timestamp: number // ms since session start
  note?: string // for annotation/checkpoint
}
