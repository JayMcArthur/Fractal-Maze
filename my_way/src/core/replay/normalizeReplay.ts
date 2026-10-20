import type { ReplayDocument } from './ReplayDocument'
import { buildNativeReplay } from './nativeReplay'
import { buildReplay } from './replayWriter'

/** Old recordings use the same loop-free route contract as new sessions. */
export function normalizeReplay(doc: ReplayDocument): ReplayDocument {
  const normalized = doc.nativeRoute
    ? buildNativeReplay(doc.maze, doc.nativeRoute, doc.solverOrPlayer, doc.status === 'complete')
    : buildReplay(doc.maze, doc.actions, doc.status, doc.startedAt, doc.solverOrPlayer)
  return {
    ...doc,
    actions: normalized.actions,
    nativeRoute: normalized.nativeRoute,
    derivedPath: normalized.derivedPath,
    checkpoints: normalized.checkpoints,
    metrics: { ...normalized.metrics, totalTime: doc.metrics.totalTime },
  }
}
