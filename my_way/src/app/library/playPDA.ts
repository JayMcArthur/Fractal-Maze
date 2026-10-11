import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { compileSquarePDA, alignAlicePDA } from '../../core/play/squarePDA'
import { alignSquareModel } from '../../core/play/matchPDA'
import { viewsForMaze } from './mazeViews'
import { pathDocs } from './pathCatalog'

/** Only a verified port mapping allows a remake to reuse a source PDA. */
export function squarePlayPDA(doc: RecursiveMazeDocument) {
  if (doc.definition.type !== 'squareRecursive') throw new Error('Expected a corridor maze.')
  const compiled = compileSquarePDA(doc.definition)
  const views = viewsForMaze(doc.metadata.id)
  for (const view of views) {
    const source = pathDocs.find((doc) => doc.metadata.id === view.id)?.definition
    if (!source || source.type !== 'pathPushdown') continue
    const matched =
      doc.metadata.id === 'alice-in-wonderland'
        ? alignAlicePDA(doc.definition, compiled, source)
        : alignSquareModel(doc.definition, compiled, source)
    if (matched) return { ...matched, sourceId: view.id }
  }
  return { ...compiled, sourceId: null }
}
