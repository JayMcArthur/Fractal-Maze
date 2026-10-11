import index from '../../data/manifests/library-index.json'
import type { CatalogEntry } from './catalog'
import type { MazeDefinition } from '../../core/model/RecursiveMazeDocument'

export type IndexedMaze = CatalogEntry & {
  preview: {
    definitionType: MazeDefinition['type']
    playable: boolean
    review: 'wip' | 'reviewed' | null
    asset: string
  }
}

/** Browsing needs card metadata and covers, not every movement model. */
export const catalogIndex = index.entries as IndexedMaze[]

export const referenceDraftId = (id: string): string | undefined =>
  index.references.find((reference) => reference.id === id)?.draftId ?? undefined

export const sourcePlayableId = (id: string): string | undefined =>
  index.references.find((reference) => reference.id === id)?.playableId ?? undefined
