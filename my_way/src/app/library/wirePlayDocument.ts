import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import sources from '../../data/mazes/wolf-two-artwork.json'
import { artworkSchema, pathMazeSchema } from '../../core/pathMaze/validation'

/** The fixed Wolf import and Wolfram 2 photograph have the same connected circuits. */
export function wirePlayDocument(doc: RecursiveMazeDocument): RecursiveMazeDocument | null {
  if (doc.definition.type !== 'legacyWire') return null
  const source = sources.find(source => source.reference === 'maze-images-mark-j-p-wolf-wolfram-2-jpg')!
  return { ...doc, representationType: 'pathPushdown',
    definition: pathMazeSchema.parse(source.definition), artwork: artworkSchema.parse(source.artwork) }
}
