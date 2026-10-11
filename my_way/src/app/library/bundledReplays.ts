import index from '../../data/manifests/shared-replays.json'
import { assetUrl } from '../../core/io/assetUrl'
import type { NativeRoute } from '../../core/replay/nativeReplay'
import type { ReplayDocument } from '../../core/replay/ReplayDocument'

export interface BundledReplay {
  id: string
  title: string
  mazeId: string
  moves: number
  complete: true
  format: NativeRoute['type'] | 'squareRecursive'
  proofAssisted: boolean
  asset: string
}

export const bundledReplays = index as BundledReplay[]

export async function loadBundledReplay(bundle: BundledReplay): Promise<ReplayDocument> {
  const response = await fetch(assetUrl(bundle.asset))
  if (!response.ok) throw new Error('Could not load this shared solution.')
  const { importReplay } = await import('../../core/replay/importReplay')
  const doc = importReplay(await response.text())
  if (doc.mazeRef !== bundle.mazeId || doc.status !== 'complete' ||
      doc.metrics.totalMoves !== bundle.moves ||
      (doc.nativeRoute?.type ?? doc.maze.definition.type) !== bundle.format)
    throw new Error('Shared solution does not match its listing.')
  return doc
}
