import { expect, it } from 'vitest'
import { staticRoute } from '../core/io/staticRoute'
import { decodeShareUrl, encodeShareUrl } from '../core/io/shareUrl'
import { loadCatalogMaze } from '../app/library/catalog'

it('restores a Pages route with query and hash and rejects outside-origin or outside-base redirects', () => {
  expect(staticRoute('?route=' + encodeURIComponent('/Fractal-Maze/workbench/example?tab=proof#claim'), 'https://example.test', '/Fractal-Maze/')).toBe('/Fractal-Maze/workbench/example?tab=proof#claim')
  for (const route of ['https://other.test/', '//other.test/', '/outside/', 'http://['])
    expect(staticRoute('?route=' + encodeURIComponent(route), 'https://example.test', '/Fractal-Maze/')).toBeNull()
})
it('rejects a shared document with invalid topology before persisting it', () => {
  const doc = structuredClone(loadCatalogMaze('square')!)
  if (doc.definition.type === 'squareRecursive') doc.definition.grid.cells = []
  expect(decodeShareUrl(encodeShareUrl(doc, 'https://example.test/')!)).toBeNull()
  expect(decodeShareUrl('?maze=' + 'a'.repeat(8001))).toBeNull()
})
