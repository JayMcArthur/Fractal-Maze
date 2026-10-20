import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { loadCatalogMaze } from '../app/library/catalog'
import { wirePlayDocument } from '../app/library/wirePlayDocument'
import { bundledReplays } from '../app/library/bundledReplays'
import { fmazeImportAdapter, fmazeExportAdapter } from '../core/io/adapters/fmazeAdapter'
import { importReplay } from '../core/replay/importReplay'
import { pathSessionFinished } from '../core/play/pathSession'
import { validateMaze } from '../core/validate/validateMaze'

it('keeps the original wire document export while Play uses Wolfram 2’s physical PDA', () => {
  const original = loadCatalogMaze('wolf-wire-original')!
  const before = structuredClone(original)
  const playing = wirePlayDocument(original)!
  expect(validateMaze(playing).valid).toBe(true)
  expect(playing.metadata).toEqual(original.metadata)
  expect(playing.definition).toEqual(loadCatalogMaze('draft-maze-images-mark-j-p-wolf-wolfram-2-jpg')!.definition)
  expect(fmazeImportAdapter.import(fmazeExportAdapter.export(original))).toEqual(before)
  expect(original).toEqual(before)
  expect(wirePlayDocument(playing)).toBeNull()
})

it.each(bundledReplays.filter(bundle => bundle.mazeId === 'wolf-wire-original'))(
  'plays and exports the complete named route $title in its immutable recorded layout', bundle => {
    const replay = importReplay(readFileSync(`public/${bundle.asset}`, 'utf8'))
    const model = replay.maze.definition, route = replay.nativeRoute
    if (model.type !== 'pathPushdown' || route?.type !== 'pathPushdown' || !route.physical)
      throw new Error('Expected canonical physical wire replay')
    expect(replay.status).toBe('complete')
    const recorded = replay.playArtwork ?? replay.maze.artwork!
    expect(pathSessionFinished(model, recorded, route.physical.positions.at(-1))).toBe(true)
    expect(importReplay(JSON.stringify(replay))).toEqual(replay)
  }
)
