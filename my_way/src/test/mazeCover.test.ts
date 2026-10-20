import { expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library/catalog'
import { validateMaze } from '../core/validate/validateMaze'
import { fmazeExportAdapter, fmazeImportAdapter } from '../core/io/adapters/fmazeAdapter'

const cover = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/>').toString('base64')

it('round-trips an optional cover without changing maze rules, artwork or identity', () => {
  const original = loadCatalogMaze('draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png')!
  const doc = { ...original, metadata: { ...original.metadata, cover } }
  expect(validateMaze(doc).valid).toBe(true)
  expect(fmazeImportAdapter.import(fmazeExportAdapter.export(doc))).toEqual(doc)
  expect(doc.definition).toEqual(original.definition)
  expect(doc.artwork).toEqual(original.artwork)
  expect(doc.metadata.id).toBe(original.metadata.id)
  expect(original.metadata.cover).toBeUndefined()
})

it.each(['javascript:alert(1)', 'https://example.com/cover.svg', 'data:text/html;base64,PHNjcmlwdD4=', 'data:image/png;base64,###', ''])('rejects unsafe or malformed cover metadata: %s', cover => {
  const original = loadCatalogMaze('alice-in-wonderland')!
  expect(validateMaze({ ...original, metadata: { ...original.metadata, cover } }).valid).toBe(false)
})
