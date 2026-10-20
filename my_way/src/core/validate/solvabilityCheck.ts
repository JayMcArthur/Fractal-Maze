/**
 * Fast solvability check using BFS with small limits.
 */
import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'
import type { SolverConfig } from '../model/solverInterface'
import type { SquareRecursiveDefinition } from '../model/squareRecursive'
import { bfsSolve } from '../solver/traversal/TraversalSolver'

export interface SolvabilityResult {
  solvable: boolean | 'unknown'
  solutionDepth?: number
  nodesExplored: number
}

const DEFAULT_CHECK_CONFIG: SolverConfig = {
  maxDepth: 5,
  maxNodes: 10000,
  timeoutMs: 2000,
  strategy: 'bfs',
}

export async function checkSolvability(
  doc: RecursiveMazeDocument,
  config?: Partial<SolverConfig>
): Promise<SolvabilityResult> {
  if (doc.representationType !== 'squareRecursive') {
    return { solvable: 'unknown', nodesExplored: 0 }
  }

  const cfg: SolverConfig = { ...DEFAULT_CHECK_CONFIG, ...config }
  const def = doc.definition as SquareRecursiveDefinition

  let nodesExplored = 0

  for await (const event of bfsSolve(def, cfg)) {
    nodesExplored = event.nodesExplored

    if (event.type === 'solved') {
      const solutionDepth = event.path
        ? Math.max(...event.path.map((a) => a.to.blockStack.length - 1))
        : 0
      return { solvable: true, solutionDepth, nodesExplored }
    }

    if (event.type === 'unsolvable') {
      if (event.message === 'exhausted') {
        return { solvable: false, nodesExplored }
      }
      // timeout or maxNodes
      return { solvable: 'unknown', nodesExplored }
    }
  }

  return { solvable: 'unknown', nodesExplored }
}
