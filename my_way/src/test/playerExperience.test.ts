import { adjacentMaze, mazeCatalog, viewsForMaze, replayViewsForMaze } from '../app/library/mazeViews'
import { bundledReplays } from '../app/library/bundledReplays'
import { describe, expect, it } from 'vitest'
import { catalog, loadCatalogMaze } from '../app/library'
import { usePlayerStore } from '../app/store/playerSlice'
import type { DirectionBit, SquareRecursiveDefinition } from '../core/model/squareRecursive'

describe('catalog experience', () => {
  it('loads every bundled maze through the shared catalog boundary', () => {
    expect(new Set(catalog.map((entry) => entry.id)).size).toBe(catalog.length)
    expect(catalog.some((entry) => entry.id === 'pda-guide-1')).toBe(true)
    for (const entry of catalog) {
      const doc = loadCatalogMaze(entry.id)
      expect(doc?.metadata.id).toBe(entry.id)
      expect(doc?.metadata.title).toBe(entry.title)
      expect(doc?.metadata.tags).toEqual(entry.tags)
    }
  })

  it('wraps previous and next navigation at the collection edges', () => {
    expect(adjacentMaze(mazeCatalog[0].id, -1).id).toBe(mazeCatalog.at(-1)?.id)
    expect(adjacentMaze(mazeCatalog.at(-1)!.id, 1).id).toBe(mazeCatalog[0].id)
  })

  it('keeps requested Wolfram views and excludes superseded player presentations', () => {
    expect(viewsForMaze('microchip').map((view) => view.label)).toEqual([
      'Photograph',
      'Block remake',
    ])
    expect(
      viewsForMaze('draft-maze-images-mark-j-p-wolf-wolfram-1-gif').map((view) => view.label)
    ).toEqual(['Source drawing'])
    expect(
      mazeCatalog.some((entry) =>
        ['ports-snuke_no3', 'ports-snuke_no4', 'wolf-wire-original'].includes(
          entry.id
        )
      )
    ).toBe(false)
    expect(viewsForMaze('draft-maze-images-siggy-skeptic-play-2-jpg').map(view => view.id))
      .not.toContain('sierpinski')
    expect(mazeCatalog.find(entry => entry.id === 'sierpinski')?.title)
      .toBe('Sierpinski corridor maze')
  })

  it('keeps every shared solution reachable from a Library maze replay bar', () => {
    const reachable = new Set(mazeCatalog.flatMap(entry => {
      const views = replayViewsForMaze(entry.id)
      return views.length ? views.map(view => view.id) : [entry.id]
    }))
    expect(bundledReplays.filter(replay => !reachable.has(replay.mazeId))).toEqual([])
  })
})

describe('player movement', () => {
  it('leaves the position, route and feedback untouched when a move hits a wall', () => {
    const doc = loadCatalogMaze('alice-in-wonderland')!
    const def = doc.definition as SquareRecursiveDefinition
    const startMask = def.grid.cells[def.player.row * def.grid.cols + def.player.col]
    const blockedDirection = ([1, 2, 4, 8] as DirectionBit[]).find(
      (direction) => (startMask & direction) === 0
    )!
    usePlayerStore.getState().loadMaze(doc)
    const before = usePlayerStore.getState()
    before.move(blockedDirection)
    expect(usePlayerStore.getState()).toBe(before)
  })
})
