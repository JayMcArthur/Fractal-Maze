import { expect, it } from 'vitest'
import { mazeCredits } from '../app/library/mazeCredits'
import { loadCatalogMaze } from '../app/library/catalog'

it('credits native remakes with original authors, drawings and their source programs', () => {
  const wolf = mazeCredits(loadCatalogMaze('microchip')!)
  expect(wolf.author).toContain('Mark J. P. Wolf')
  expect(wolf.links.some(link => link.href.endsWith('/Wolfram_2.jpg'))).toBe(true)
  expect(wolf.links.some(link => link.href === 'https://github.com/orelcosseron/fractal-maze')).toBe(true)
  const counter = mazeCredits(loadCatalogMaze('repeated-atomic-cp3-4')!)
  expect(counter.author).toBe('Koteitan')
  expect(counter.links.some(link => link.href === 'https://github.com/koteitan/repeated-maze')).toBe(true)
})

it('does not turn imported non-web source metadata into an executable credit link', () => {
  const original = loadCatalogMaze('alice-in-wonderland')!
  const doc = { ...original, metadata: { ...original.metadata, id: 'imported-credit', source: 'javascript:alert(1)' } }
  expect(mazeCredits(doc).links.some(link => link.href.startsWith('javascript:'))).toBe(false)
})
