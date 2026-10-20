import { afterEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import assets from '../data/manifests/maze-assets.json'
import { loadCatalogDocument } from '../app/library/loadCatalogDocument'
import { catalog, loadCatalogMaze } from '../app/library/catalog'
import { hydrateArtwork } from '../app/library/pathCatalog'

afterEach(() => vi.unstubAllGlobals())

it('loads each selected asset with the canonical rules, hydrated drawing and metadata', async () => {
  expect(assets.map(entry => entry.id)).toEqual(catalog.map(entry => entry.id))
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const entry = assets.find(entry => String(input) === import.meta.env.BASE_URL + entry.asset)!
    const text = readFileSync('public/' + entry.asset, 'utf8')
    expect(Buffer.byteLength(text)).toBe(entry.bytes)
    expect(createHash('sha256').update(text).digest('hex')).toBe(entry.asset.split('/')[1].replace('.json', ''))
    return new Response(text)
  })
  vi.stubGlobal('fetch', fetch)
  for (const entry of assets) {
    const doc = (await loadCatalogDocument(entry.id))!
    const original = await hydrateArtwork(loadCatalogMaze(entry.id)!)
    expect(doc.definition).toEqual(original.definition)
    expect(doc.artwork).toEqual(original.artwork)
    expect(doc.renderConfig).toEqual(original.renderConfig)
    expect(doc.solverConfig).toEqual(original.solverConfig)
    expect({ ...doc.metadata, createdAt: '', updatedAt: '' }).toEqual({ ...original.metadata, createdAt: '', updatedAt: '' })
  }
  expect(fetch).toHaveBeenCalledTimes(assets.length)
})

it('does not request an unknown maze and rejects failed, invalid or mismatched documents', async () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(await loadCatalogDocument('missing-maze')).toBeNull()
  expect(fetch).not.toHaveBeenCalled()
  fetch.mockResolvedValueOnce(new Response('', { status: 503 }))
  await expect(loadCatalogDocument('alice-in-wonderland')).rejects.toThrow('could not be loaded')
  fetch.mockResolvedValueOnce(new Response(JSON.stringify({ formatVersion: '1.0', representationType: 'squareRecursive' })))
  await expect(loadCatalogDocument('alice-in-wonderland')).rejects.toThrow('invalid data')
  fetch.mockResolvedValueOnce(new Response(JSON.stringify(loadCatalogMaze('square'))))
  await expect(loadCatalogDocument('alice-in-wonderland')).rejects.toThrow('different ID')
})

it('coalesces concurrent loads while keeping each editable document separate and failed loads retryable', async () => {
  const entry = assets.find(entry => entry.id === 'alice-in-wonderland')!
  const contents = readFileSync('public/' + entry.asset, 'utf8')
  const fetch = vi.fn(async () => new Response(contents))
  vi.stubGlobal('fetch', fetch)
  const [first, second] = await Promise.all([loadCatalogDocument(entry.id), loadCatalogDocument(entry.id)])
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(first).toEqual(second)
  first!.metadata.title = 'Edited copy'
  expect(second!.metadata.title).not.toBe('Edited copy')
  fetch.mockRejectedValueOnce(new Error('Offline'))
  await expect(loadCatalogDocument(entry.id)).rejects.toThrow('Offline')
  expect((await loadCatalogDocument(entry.id))!.metadata.title).toBe(second!.metadata.title)
  expect(fetch).toHaveBeenCalledTimes(3)
})
