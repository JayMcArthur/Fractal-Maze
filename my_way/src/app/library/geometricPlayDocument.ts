import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { compileGeometricPDA } from '../../core/play/geometricPDA'
import { geometricArtwork } from '../../core/play/geometricArtwork'

export function geometricPlayDocument(doc: RecursiveMazeDocument): RecursiveMazeDocument | null {
  if (doc.definition.type !== 'geometricRecursive') return null
  const model = compileGeometricPDA(doc.definition.maze)
  return { ...doc, representationType: 'pathPushdown', definition: model,
    artwork: geometricArtwork(doc.definition.maze, model) }
}
