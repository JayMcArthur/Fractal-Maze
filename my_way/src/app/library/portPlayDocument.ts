import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { compilePortPDA } from '../../core/play/portPDA'
import sources from '../../data/mazes/snuke-artwork.json'
import { artworkSchema, pathMazeSchema } from '../../core/pathMaze/validation'
import { stateKey } from '../../core/pathMaze/traversal'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { createBlockArtwork } from '../../core/play/blockArtwork'
import { ruleArtwork } from '../../core/play/ruleArtwork'

const transitions = (model: PathMazeDefinition) =>
  [
    ...new Set(
      model.connections.map((edge) =>
        JSON.stringify([edge.from, edge.to, edge.operation, edge.copy])
      )
    ),
  ]
    .sort()
    .join('\n')

export function portPlayDocument(doc: RecursiveMazeDocument): RecursiveMazeDocument | null {
  if (doc.definition.type !== 'recursivePorts') return null
  const model = compilePortPDA(doc.definition)
  const sourceId =
    doc.metadata.id.replace('ports-snuke_no', 'draft-maze-images-snuke-snuke-') + '-png'
  const row = sources.find(source => `draft-${source.reference}` === sourceId)
  const candidate = row ? { definition: pathMazeSchema.parse(row.definition), artwork: artworkSchema.parse(row.artwork) } : undefined
  const rules = candidate?.definition
  const source =
    rules?.type === 'pathPushdown' &&
    rules.start &&
    rules.goal &&
    model.start &&
    model.goal &&
    stateKey(rules.start) === stateKey(model.start) &&
    stateKey(rules.goal) === stateKey(model.goal) &&
    transitions(rules) === transitions(model)
      ? candidate
      : undefined
  return {
    ...doc,
    representationType: 'pathPushdown',
    definition: source?.definition ?? model,
    artwork: source?.artwork ?? createBlockArtwork(ruleArtwork(model, model.paths.filter(path => path.helper).map(path => path.id)), model),
  }
}
