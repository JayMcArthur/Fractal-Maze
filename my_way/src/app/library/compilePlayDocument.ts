import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { RecursivePortsDefinition } from '../../core/model/recursivePorts'
import type { PathMazeDefinition } from '../../core/model/pathMaze'
import { compileGeometricPDA } from '../../core/play/geometricPDA'
import { geometricArtwork } from '../../core/play/geometricArtwork'
import { compilePortPDA } from '../../core/play/portPDA'
import { createBlockArtwork } from '../../core/play/blockArtwork'
import { ruleArtwork } from '../../core/play/ruleArtwork'
import { stateKey } from '../../core/pathMaze/traversal'
import { artworkSchema, pathMazeSchema } from '../../core/pathMaze/validation'
import portSources from '../../data/mazes/snuke-artwork.json'
import wireSources from '../../data/mazes/wolf-two-artwork.json'

/** Compile supported native formats once for Play, Solve and Build; preserve other models. */
export function compilePlayDocument(doc: RecursiveMazeDocument): RecursiveMazeDocument {
  switch (doc.definition.type) {
    case 'geometricRecursive': {
      const model = compileGeometricPDA(doc.definition.maze)
      return {
        ...doc,
        representationType: 'pathPushdown',
        definition: model,
        artwork: geometricArtwork(doc.definition.maze, model),
      }
    }
    case 'recursivePorts':
      return portDocument(doc, doc.definition)
    case 'legacyWire': {
      // The fixed Wolf import and Wolfram 2 photograph have the same circuits.
      const source = wireSources.find(
        (source) => source.reference === 'maze-images-mark-j-p-wolf-wolfram-2-jpg'
      )!
      return {
        ...doc,
        representationType: 'pathPushdown',
        definition: pathMazeSchema.parse(source.definition),
        artwork: artworkSchema.parse(source.artwork),
      }
    }
    default:
      return doc
  }
}

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

function portDocument(
  doc: RecursiveMazeDocument,
  definition: RecursivePortsDefinition
): RecursiveMazeDocument {
  const model = compilePortPDA(definition)
  const sourceId =
    doc.metadata.id.replace('ports-snuke_no', 'draft-maze-images-snuke-snuke-') + '-png'
  const row = portSources.find((source) => `draft-${source.reference}` === sourceId)
  const candidate = row
    ? {
        definition: pathMazeSchema.parse(row.definition),
        artwork: artworkSchema.parse(row.artwork),
      }
    : undefined
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
    artwork:
      source?.artwork ??
      createBlockArtwork(
        ruleArtwork(
          model,
          model.paths.filter((path) => path.helper).map((path) => path.id)
        ),
        model
      ),
  }
}
