/**
 * Builds a ReplayDocument from a completed player session.
 */
import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'
import type { PlayerAction } from '../model/playerState'
import type { ReplayDocument } from './ReplayDocument'
import { appendRouteAction } from './routeHistory'

const MOVEMENT_TYPES = new Set<string>([
  'move',
  'enterBlock',
  'exitBlock',
  'teleport',
  'solverStep',
])

export function buildReplay(
  doc: RecursiveMazeDocument,
  actions: PlayerAction[],
  status: 'complete' | 'partial' | 'failed',
  startedAt: string,
  solverOrPlayer: 'human' | 'solver'
): ReplayDocument {
  const totalTime =
    actions.filter((action) => MOVEMENT_TYPES.has(action.type)).at(-1)?.timestamp ?? 0
  actions = actions.reduce(appendRouteAction, [] as PlayerAction[])
  const movementActions = actions.filter((a) => MOVEMENT_TYPES.has(a.type))

  const totalMoves = movementActions.length

  const maxDepthReached = movementActions.reduce(
    (max, a) => Math.max(max, a.to.blockStack.length - 1),
    0
  )

  const derivedPath = movementActions.map((a) => a.to)

  const checkpoints = actions
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.type === 'checkpoint')
    .map(({ i }) => i)

  const endedAt = new Date().toISOString()

  return structuredClone({
    formatVersion: '1.0',
    mazeRef: doc.metadata.id,
    maze: doc,
    mazeTitle: doc.metadata.title,
    solverOrPlayer,
    startedAt,
    endedAt,
    status,
    actions,
    derivedPath,
    checkpoints,
    metrics: {
      totalMoves,
      totalTime,
      maxDepthReached,
    },
  })
}
