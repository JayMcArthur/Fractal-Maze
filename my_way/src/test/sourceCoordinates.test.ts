import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { pathDocs } from '../app/library/pathCatalog'
import { artworkRoute } from '../core/pathMaze/artworkRoutes'
import { createElement } from 'react'
import { render } from '@testing-library/react'
import { ArtworkView } from '../ui/workbench/ArtworkView'

it.each(pathDocs.filter(doc => doc.artwork?.gates?.length && doc.artwork.asset.endsWith('.png')))(
  '$metadata.title keeps its PNG pixel coordinates in the player', doc => {
    const artwork = doc.artwork!
    const png = readFileSync(`public/${artwork.asset}`)
    expect([artwork.width, artwork.height]).toEqual([png.readUInt32BE(16), png.readUInt32BE(20)])
  }
)

it('Alice renders the source image in the same pixel space as its playable routes', () => {
  const doc = pathDocs.find(doc => doc.metadata.id === 'draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png')!
  const artwork = doc.artwork!
  const png = readFileSync(`public/${artwork.asset}`)
  expect(artwork.bounds).toEqual([0, 0, png.readUInt32BE(16), png.readUInt32BE(20)])
  for (const trace of artwork.traces)
    for (const [x, y] of trace.points) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(artwork.width)
      expect(y).toBeLessThanOrEqual(artwork.height)
    }
})

it('First Cantor permits travel through its filled blue finish junction', () => {
  const artwork = pathDocs.find(doc => doc.metadata.id === 'proof-maze-images-siggy-first-cantor-svg')!.artwork!
  expect(artworkRoute(artwork, '12', [37.9469, 46.7932], [74.4097, 46.7932])).not.toBeNull()
})

it('Infinite Descent retains the stroked cyan branch and its entry into A6', () => {
  const doc = pathDocs.find(doc => doc.metadata.id === 'proof-maze-images-siggy-infinite-descent-svg')!
  const model = doc.definition
  if (model.type !== 'infiniteRule') throw new Error('Expected infinite maze')
  const artwork = doc.artwork!
  const branch = artwork.traces.find(trace => trace.id === 'path9107')!
  expect(branch.path).toBe('1')
  const edge = model.connections.find(edge => edge.from === '1' && edge.to === '6' && edge.copy === 'A' && edge.operation === 'enter')!
  expect(edge).toBeDefined()
  const gate = artwork.gates!.find(gate => gate.edge === edge.id)!
  expect(gate.from[0]).toBeCloseTo(49.076636, 3)
  expect(gate.from[1]).toBeCloseTo(59.415719, 3)
  expect(artworkRoute(artwork, '1', artwork.start!, gate.from)).not.toBeNull()
})

it('respects an intentionally scaled Alice workbench drawing', () => {
  const artwork = structuredClone(pathDocs.find(doc => doc.metadata.id === 'draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png')!.artwork!)
  artwork.width = artwork.height = 1200
  artwork.bounds = [0, 0, 1200, 1200]
  const { container, unmount } = render(createElement(ArtworkView, { artwork }))
  expect(container.querySelector('image')).toHaveAttribute('width', '1200')
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 1200 1200')
  unmount()
})
