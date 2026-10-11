import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { loadCatalogMaze } from './catalog'

/** The fixed Wolf import and Wolfram 2 photograph have the same connected circuits. */
export function wirePlayDocument(doc: RecursiveMazeDocument): RecursiveMazeDocument | null {
  if (doc.definition.type !== 'legacyWire') return null
  const source = loadCatalogMaze('draft-maze-images-mark-j-p-wolf-wolfram-2-jpg')!
  return { ...doc, representationType: source.representationType,
    definition: source.definition, artwork: source.artwork }
}
