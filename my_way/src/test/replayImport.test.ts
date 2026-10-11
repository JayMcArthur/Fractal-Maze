import { describe, expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library'
import { buildNativeReplay } from '../core/replay/nativeReplay'
import { buildReplay } from '../core/replay/replayWriter'
import { importReplay } from '../core/replay/importReplay'
import type { RepeatedDirectedDefinition } from '../core/model/repeatedDirected'

describe('replay file import', () => {
  it('round trips an empty square recording with its original maze', () => {
    const doc = buildReplay(
      loadCatalogMaze('square')!,
      [],
      'partial',
      '2026-10-09T00:00:00Z',
      'human'
    )
    expect(importReplay(JSON.stringify(doc))).toEqual(doc)
  })
  it('round trips a native source solution', () => {
    const maze = loadCatalogMaze('repeated-md3')!,
      def = maze.definition as RepeatedDirectedDefinition
    const doc = buildNativeReplay(
      maze,
      { type: 'repeatedDirected', states: def.providedRoute! },
      'solver',
      true
    )
    expect(importReplay(JSON.stringify(doc))).toEqual(doc)
  })
  it('rejects a maze file where a replay was expected', () =>
    expect(() => importReplay(JSON.stringify(loadCatalogMaze('square')))).toThrow(
      'Choose an exported'
    ))
  it('rejects an unknown recursive port block before rendering', () => {
    const doc = buildNativeReplay(
      loadCatalogMaze('ports-snuke_no3')!,
      { type: 'recursivePorts', states: [{ blocks: [99], port: 0 }] },
      'human',
      false
    )
    expect(() => importReplay(JSON.stringify(doc))).toThrow('illegal recursive-port route')
  })
})
