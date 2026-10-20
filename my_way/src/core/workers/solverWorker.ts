/**
 * Solver Web Worker.
 * Receives: { type: 'solve', doc: RecursiveMazeDocument, config: SolverConfig }
 * Posts back: SolverEvent objects
 * Handles: { type: 'cancel' } to abort
 */
import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'
import type { SolverConfig, SolverEvent } from '../model/solverInterface'
import type { SquareRecursiveDefinition } from '../model/squareRecursive'
import { bfsSolve } from '../solver/traversal/TraversalSolver'
import { iddfsSolve } from '../solver/depthBounded/DepthBoundedSolver'

type WorkerMessage =
  | { type: 'solve'; doc: RecursiveMazeDocument; config: SolverConfig }
  | { type: 'cancel' }

let cancelled = false

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data
  if (msg.type === 'cancel') {
    cancelled = true
    return
  }

  if (msg.type === 'solve') {
    cancelled = false
    const { doc, config } = msg

    if (doc.representationType !== 'squareRecursive') {
      const errEvent: SolverEvent = {
        type: 'error',
        nodesExplored: 0,
        depth: 0,
        message: 'Unsupported maze type: ' + doc.representationType,
      }
      self.postMessage(errEvent)
      return
    }

    const def = doc.definition as SquareRecursiveDefinition
    const gen =
      config.strategy === 'iddfs' ? iddfsSolve(def, config) : bfsSolve(def, config)

    for await (const event of gen) {
      if (cancelled) {
        const cancelEvent: SolverEvent = {
          type: 'unsolvable',
          nodesExplored: event.nodesExplored,
          depth: event.depth,
          message: 'cancelled',
        }
        self.postMessage(cancelEvent)
        return
      }
      self.postMessage(event)
      if (event.type === 'solved' || event.type === 'unsolvable' || event.type === 'error') {
        return
      }
    }
  }
}
