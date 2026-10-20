import { describe, expect, it } from 'vitest'
import { artworkRoute, pointAlongRoute } from '../core/pathMaze/artworkRoutes'
import type { MazeArtwork } from '../core/model/pathMaze'
const artwork: MazeArtwork = {
  asset: 'references/test.svg',
  width: 100,
  height: 100,
  bounds: [0, 0, 100, 100],
  frames: [],
  traces: [
    {
      id: 'a',
      path: '1',
      color: 'red',
      points: [
        [0, 50],
        [50, 50],
        [100, 50],
      ],
    },
    {
      id: 'b',
      path: '1',
      color: 'red',
      points: [
        [50, 0],
        [50, 50],
        [50, 100],
      ],
    },
    {
      id: 'c',
      path: '2',
      color: 'blue',
      points: [
        [100, 50],
        [100, 100],
      ],
    },
  ],
}
describe('source route movement', () => {
  it('keeps directed wire crossings separate in block artwork', () => {
    const directed = {
      ...artwork,
      blockSize: 10,
      traces: artwork.traces.slice(0, 2).map(trace => ({ ...trace, directed: true })),
    }
    expect(artworkRoute(directed, '1', [0, 50], [50, 100])).toBeNull()
    expect(artworkRoute(directed, '1', [0, 50], [100, 50])).not.toBeNull()
  })
  it('follows an arrow forward and refuses travel against it', () => {
    const directed = { ...artwork, traces: [{ ...artwork.traces[0], directed: true }] }
    expect(artworkRoute(directed, '1', [25, 50], [75, 50])).not.toBeNull()
    expect(artworkRoute(directed, '1', [75, 50], [25, 50])).toBeNull()
  })
  it('does not turn at an unmarked crossing or onto another path', () => {
    expect(artworkRoute(artwork, '1', [0, 50], [50, 100])).toBeNull()
    expect(artworkRoute(artwork, '1', [0, 50], [100, 100])).toEqual([
      [0, 50],
      [50, 50],
      [100, 50],
    ])
  })
  it('walks connected stroke endpoints and interpolates along the bends', () => {
    const linked = {
      ...artwork,
      traces: [
        artwork.traces[0],
        {
          ...artwork.traces[1],
          points: [
            [100, 50],
            [100, 100],
          ] as [number, number][],
        },
      ],
    }
    const route = artworkRoute(linked, '1', [25, 50], [100, 75])!
    expect(route).not.toBeNull()
    expect(pointAlongRoute(route, 85)).toEqual([100, 60])
  })
})
