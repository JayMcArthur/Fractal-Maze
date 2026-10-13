import assets from '../../data/manifests/maze-assets.json'
import { fmazeImportAdapter } from '../../core/io/adapters/fmazeAdapter'
import { validateMaze } from '../../core/validate/validateMaze'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'

const pending = new Map<string, Promise<RecursiveMazeDocument>>()

/** Download only the selected canonical document, with its already hydrated artwork. */
export async function loadCatalogDocument(id: string): Promise<RecursiveMazeDocument | null> {
  const entry = assets.find(entry => entry.id === id)
  if (!entry) return null
  const request = pending.get(id) ?? fetchDocument(entry)
  pending.set(id, request)
  try {
    return structuredClone(await request)
  } finally {
    if (pending.get(id) === request) pending.delete(id)
  }
}

async function fetchDocument(entry: (typeof assets)[number]): Promise<RecursiveMazeDocument> {
  const response = await fetch(import.meta.env.BASE_URL + entry.asset)
  if (!response.ok) throw new Error('The selected maze could not be loaded.')
  const doc = fmazeImportAdapter.import(await response.text())
  const validation = validateMaze(doc)
  if (!validation.valid) throw new Error('The selected maze contains invalid data.')
  if (doc.metadata.id !== entry.id) throw new Error('The selected maze document has a different ID.')
  return doc
}
