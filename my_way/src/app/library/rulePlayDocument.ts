import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { createBlockArtwork } from '../../core/play/blockArtwork'
import { ruleArtwork } from '../../core/play/ruleArtwork'
import { longPathArtwork } from './longPathArtwork'
import { simpleHopArtwork } from '../../core/play/simpleHopArtwork'

/** Give a rule-only model physical corridors without binding its original image. */
export function rulePlayDocument(doc: RecursiveMazeDocument): RecursiveMazeDocument | null {
  const model = doc.definition
  if (
    (model.type !== 'pathPushdown' && model.type !== 'infiniteRule') ||
    !model.start ||
    !model.goal
  )
    return null
  if (
    doc.artwork?.gates?.length ||
    doc.artwork?.traces.some((trace) => model.paths.some((path) => path.id === trace.path))
  )
    return null
  return {
    ...doc,
    artwork: simpleHopArtwork(model) ?? longPathArtwork(model) ?? createBlockArtwork(ruleArtwork(model), model),
  }
}
