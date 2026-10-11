import { expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { catalog, loadCatalogMaze } from '../app/library/catalog'
import { catalogIndex, referenceDraftId, sourcePlayableId } from '../app/library/catalogIndex'
import references from '../data/manifests/references.json'
import { mazeEntry } from '../app/library/mazeViews'

it('keeps every Library entry, original cover, review and launch decision current with its actual model', () => {
  expect(catalogIndex.map(entry => entry.id)).toEqual(catalog.map(entry => entry.id))
  for (const entry of catalogIndex) {
    const { preview, ...metadata } = entry
    expect(metadata).toEqual(catalog.find(maze => maze.id === entry.id))
    const doc = loadCatalogMaze(entry.id)!, model = doc.definition
    expect(preview.definitionType).toBe(model.type)
    expect(preview.playable).toBe(mazeEntry(entry.id, doc).playable)
    expect(preview.review).toBe('review' in model ? model.review : null)
    expect(existsSync(`public/${preview.asset}`)).toBe(true)
    if (doc.artwork?.asset) expect(preview.asset).toBe(doc.artwork.asset)
  }
})

it('binds every reference Play link to its real source gates and preserves unbound review links', () => {
  for (const reference of references) {
    const id = referenceDraftId(reference.id), doc = id && loadCatalogMaze(id)
    const model = doc && doc.definition
    const bound = model && (model.type === 'pathPushdown' || model.type === 'infiniteRule') &&
      model.start && model.goal && model.connections.length &&
      doc.artwork?.gates?.length === model.connections.length
    expect(sourcePlayableId(reference.id)).toBe(bound ? id : undefined)
    if (id) expect(doc).toBeTruthy()
  }
  expect(referenceDraftId('maze-images-martin-windischer-windischer-png')).toBe('draft-maze-images-martin-windischer-windischer-png')
  expect(sourcePlayableId('maze-images-martin-windischer-windischer-png')).toBeUndefined()
})
