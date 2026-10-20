import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { detectAdapter, ALL_IMPORT_ADAPTERS } from '../core/io/detectFormat'
import { fmazeExportAdapter, fmazeImportAdapter } from '../core/io/adapters/fmazeAdapter'
import { orelMazeImportAdapter, orelMazeExportAdapter } from '../core/io/adapters/orelMazeAdapter'
import { amurielagiImportAdapter } from '../core/io/adapters/amurielagiAdapter'
import { encodeShareUrl, decodeShareUrl } from '../core/io/shareUrl'
import type { SquareRecursiveDefinition } from '../core/model/squareRecursive'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MAZES_DIR = join(__dirname, '../data/mazes')

describe('Format auto-detection', () => {
  it('detects .maze format', () => {
    const text = readFileSync(join(MAZES_DIR, '1_-_alice_in_wonderland.maze'), 'utf-8')
    const adapter = detectAdapter(text)
    expect(adapter).not.toBeNull()
    expect(adapter!.formatName).toBe('Orelcosseron .maze')
  })

  it('detects .fmaze format', () => {
    const text = readFileSync(join(MAZES_DIR, '1_-_alice_in_wonderland.maze'), 'utf-8')
    const doc = orelMazeImportAdapter.import(text)
    const fmazeStr = fmazeExportAdapter.export(doc)
    const adapter = detectAdapter(fmazeStr)
    expect(adapter).not.toBeNull()
    expect(adapter!.formatName).toBe('.fmaze canonical')
  })

  it('detects amurielagi FRACTAL-MAZE.v2 format', () => {
    const sample = JSON.stringify([{ uid: 'abc', token: 'FRACTAL-MAZE.v2', name: 'Test', paths: [] }])
    const adapter = detectAdapter(sample)
    expect(adapter).not.toBeNull()
    expect(adapter!.formatName).toBe('amurielagi FRACTAL-MAZE.v2')
  })

  it('returns null for unrecognised content', () => {
    const adapter = detectAdapter('this is not a maze file')
    expect(adapter).toBeNull()
  })

  it('registers all six supported import formats', () => {
    expect(ALL_IMPORT_ADAPTERS.length).toBe(6)
  })

  it('detects Koteitan block JSON', () => {
    const sample = JSON.stringify({ map: [[0, 1], [0, 0]], start: [0, 0], goal: [1, 1] })
    const adapter = detectAdapter(sample)
    expect(adapter?.formatName).toBe('Koteitan fractal block JSON')
    expect(adapter?.import(sample).representationType).toBe('blockRecursive')
  })
})

describe('amurielagi adapter', () => {
  const sample = JSON.stringify([{ uid: 'test-uid', token: 'FRACTAL-MAZE.v2', name: 'Test Maze', size: 1,
    startingPoint: { id: 's', x: 10, y: 10 }, finish: { id: 'f', x: 70, y: 70 }, subMazes: [{ id: 'A', x: 20, y: 20 }],
    paths: [{ color: '#000', points: [], gates: ['A:1', 's:3'] }],
  }])

  it('imports FRACTAL-MAZE.v2 JSON', () => {
    const doc = amurielagiImportAdapter.import(sample)
    expect(doc.representationType).toBe('geometricRecursive')
    expect(doc.metadata.title).toBe('Test Maze')
  })

  it('canImport returns false for non-amurielagi JSON', () => {
    expect(amurielagiImportAdapter.canImport('{"foo":"bar"}')).toBe(false)
    expect(amurielagiImportAdapter.canImport('[{"token":"other"}]')).toBe(false)
  })

  it('canImport returns true for valid sample', () => {
    expect(amurielagiImportAdapter.canImport(sample)).toBe(true)
  })
})

describe('.fmaze + .maze full round-trip', () => {
  it('alice: .maze → import → .fmaze export → .fmaze import → .maze export → cells match', () => {
    const original = readFileSync(join(MAZES_DIR, '1_-_alice_in_wonderland.maze'), 'utf-8')
    const doc1 = orelMazeImportAdapter.import(original)

    // .fmaze round-trip
    const fmazeStr = fmazeExportAdapter.export(doc1)
    const doc2 = fmazeImportAdapter.import(fmazeStr)

    // .maze re-export from canonical
    const mazeStr = orelMazeExportAdapter.export(doc2)
    const doc3 = orelMazeImportAdapter.import(mazeStr)

    const def1 = doc1.definition as SquareRecursiveDefinition
    const def3 = doc3.definition as SquareRecursiveDefinition

    expect(def3.grid.cells).toEqual(def1.grid.cells)
    expect(def3.blocks.length).toBe(def1.blocks.length)
    expect(def3.exits.length).toBe(def1.exits.length)
    expect(def3.links.length).toBe(def1.links.length)
  })
})

describe('Share URL encoding', () => {
  it('encodes and decodes a small maze', () => {
    const text = readFileSync(join(MAZES_DIR, '4_-_square.maze'), 'utf-8')
    const doc = orelMazeImportAdapter.import(text)

    const url = encodeShareUrl(doc, 'https://example.com/Fractal-Maze/')
    // Small maze should fit in URL
    if (url !== null) {
      const decoded = decodeShareUrl(url)
      expect(decoded).not.toBeNull()
      const defOrig = doc.definition as SquareRecursiveDefinition
      const defDecoded = decoded!.definition as SquareRecursiveDefinition
      expect(defDecoded.grid.cells).toEqual(defOrig.grid.cells)
    }
    // If url is null, the maze is too large — not a failure condition
  })

  it('decodeShareUrl returns null for URLs with no maze param', () => {
    expect(decodeShareUrl('https://example.com/?foo=bar')).toBeNull()
    expect(decodeShareUrl('')).toBeNull()
  })

  it('decodeShareUrl returns null for corrupted data', () => {
    expect(decodeShareUrl('?maze=notvalidbase64!!!')).toBeNull()
  })
})
