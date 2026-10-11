// Borrowing: koteitan pool-based state, iterative deepening; amurielagi shortestPath
import type { RecursiveMazeDocument, RepresentationType } from './RecursiveMazeDocument'
import type { PlayerAction, PlayerPosition } from './playerState'

export type SolverStatus = 'idle' | 'running' | 'solved' | 'unsolvable' | 'timeout'

export interface SolverEvent {
  type: 'progress' | 'solved' | 'unsolvable' | 'error'
  nodesExplored: number
  depth: number
  path?: PlayerAction[] // if solved
  frontier?: PlayerPosition[] // for visualization
  message?: string
}

export interface SolverConfig {
  maxDepth: number
  maxNodes: number
  timeoutMs: number
  strategy: 'bfs' | 'dfs' | 'astar' | 'iddfs'
}

export interface Solver {
  supportedTypes: RepresentationType[]
  solve(doc: RecursiveMazeDocument, config: SolverConfig): AsyncGenerator<SolverEvent>
  cancel(): void
}

export const defaultSolverConfig: SolverConfig = {
  maxDepth: 10,
  maxNodes: 100000,
  timeoutMs: 30000,
  strategy: 'bfs',
}
