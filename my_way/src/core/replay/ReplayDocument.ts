import type { NativeRoute } from './nativeReplay'
import type { PlayerAction, PlayerPosition } from '../model/playerState'
import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'
import type { MazeArtwork } from '../model/pathMaze'

export interface ReplayDocument {
  formatVersion: '1.0'
  mazeRef: string // maze document id
  maze: RecursiveMazeDocument
  /** Geometry selected for this run; the original maze artwork remains in the snapshot. */
  playArtwork?: MazeArtwork
  mazeTitle: string
  solverOrPlayer: 'human' | 'solver'
  startedAt: string // ISO8601
  endedAt?: string
  status: 'complete' | 'partial' | 'failed'
  nativeRoute?: NativeRoute
  actions: PlayerAction[]
  derivedPath: PlayerPosition[] // movement destinations, including partial runs
  checkpoints: number[] // indices into actions[]
  metrics: {
    totalMoves: number
    totalTime: number
    maxDepthReached: number
  }
}
