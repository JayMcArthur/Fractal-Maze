import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { compileSquarePDA, alignAlicePDA } from '../../core/play/squarePDA'
import { alignSquareModel } from '../../core/play/matchPDA'
import { replayViewsForMaze } from './mazeViews'
import sources from '../../data/manifests/square-source-models.json'
import { pathMazeSchema } from '../../core/pathMaze/validation'

const models = Object.fromEntries(Object.entries(sources).map(([id, model]) => [id, pathMazeSchema.parse(model)]))

/** Only a verified port mapping allows a remake to reuse a source PDA. */
export function squarePlayPDA(doc: RecursiveMazeDocument) {
  if (doc.definition.type !== 'squareRecursive') throw new Error('Expected a corridor maze.')
  const compiled = compileSquarePDA(doc.definition)
  // Model correspondence survives retirement of a public drawing.
  const views = replayViewsForMaze(doc.metadata.id)
  for (const view of views) {
    const source = models[view.id]
    if (!source || source.type !== 'pathPushdown') continue
    const matched =
      doc.metadata.id === 'alice-in-wonderland'
        ? alignAlicePDA(doc.definition, compiled, source)
        : alignSquareModel(doc.definition, compiled, source)
    if (matched) return { ...matched, sourceId: view.id }
  }
  return { ...compiled, sourceId: null }
}
