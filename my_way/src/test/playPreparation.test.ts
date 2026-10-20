import { expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { catalog, loadCatalogMaze } from '../app/library/catalog'
import { compilePlayDocument } from '../app/library/compilePlayDocument'
import { prepareReplay } from '../app/library/prepareReplay'
import { bundledReplays } from '../app/library/bundledReplays'
import { importReplay } from '../core/replay/importReplay'
import { validateMaze } from '../core/validate/validateMaze'
import { pathSessionFinished } from '../core/play/pathSession'

it('compiles native path formats without changing source documents, proof rules or richer native state', () => {
  for (const entry of catalog) {
    const source = loadCatalogMaze(entry.id)!
    const before = structuredClone(source)
    const playing = compilePlayDocument(source)
    expect(source).toEqual(before)
    expect(playing.metadata).toEqual(source.metadata)
    expect(validateMaze(playing).issues.filter((issue) => issue.severity === 'error')).toEqual([])
    if (['geometricRecursive', 'recursivePorts', 'legacyWire'].includes(source.definition.type)) {
      expect(playing.definition.type).toBe('pathPushdown')
    } else {
      // Preserve proof claims and non-PDA constraints; they are not source-format conversions.
      expect(playing).toBe(source)
    }
    expect(compilePlayDocument(playing)).toBe(playing)
  }
})

it.each(bundledReplays)('prepares $id without changing its original export or finish', (bundle) => {
  const source = importReplay(readFileSync(`public/${bundle.asset}`, 'utf8'))
  const before = JSON.stringify(source)
  const playing = prepareReplay(source)
  expect(JSON.stringify(source)).toBe(before)
  expect(importReplay(JSON.stringify(playing)).status).toBe('complete')
  const route = playing.nativeRoute
  const model = playing.maze.definition
  if (
    (route?.type === 'pathPushdown' || route?.type === 'infiniteRule') &&
    route.physical &&
    (model.type === 'pathPushdown' || model.type === 'infiniteRule')
  ) {
    expect(
      pathSessionFinished(
        model,
        playing.playArtwork ?? playing.maze.artwork,
        route.physical.positions.at(-1)
      )
    ).toBe(true)
  }
})
