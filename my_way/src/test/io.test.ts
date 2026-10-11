import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { orelMazeImportAdapter, orelMazeExportAdapter } from '../core/io/adapters/orelMazeAdapter'
import { fmazeImportAdapter, fmazeExportAdapter } from '../core/io/adapters/fmazeAdapter'
import { validateMaze } from '../core/validate/validateMaze'
import type { SquareRecursiveDefinition } from '../core/model/squareRecursive'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const MAZES_DIR = join(__dirname, '../data/mazes')

const MAZE_FILES = [
  '1_-_alice_in_wonderland.maze',
  '2_-_sierpinski.maze',
  '3_-_microchip.maze',
  '4_-_square.maze',
  '5_-_Jay_McArthur_-_A_Long_Path_v4.maze',
  '6_-_Jay_McArthur_-_A_Long_Path_v8.maze',
  '7_-_Matthias_Weber_-_Fractal_Maze.maze',
  '8_-_Skeptic_Play_-_Carpet.maze',
  '9_-_Block_Maze.maze',
]

describe('Orel .maze import', () => {
  for (const filename of MAZE_FILES) {
    it(`parses ${filename} without error`, () => {
      const text = readFileSync(join(MAZES_DIR, filename), 'utf-8')
      expect(orelMazeImportAdapter.canImport(text)).toBe(true)
      const doc = orelMazeImportAdapter.import(text)
      expect(doc.formatVersion).toBe('1.0')
      expect(doc.representationType).toBe('squareRecursive')
      const def = doc.definition as SquareRecursiveDefinition
      expect(def.type).toBe('squareRecursive')
      expect(def.grid.rows).toBeGreaterThan(0)
      expect(def.grid.cols).toBeGreaterThan(0)
      expect(def.grid.cells.length).toBe(def.grid.rows * def.grid.cols)
    })
  }

  it('rejects ragged tile grids instead of silently shifting cells', () => {
    const text = `TILE_SIZE 20\n0000\n000000\nPLAYER 00 00 #ffffff`
    expect(() => orelMazeImportAdapter.import(text)).toThrow(/same width/)
  })

  it('rejects tile values outside the four-bit Orel range', () => {
    const text = `TILE_SIZE 20\n0016\nPLAYER 00 00 #ffffff`
    expect(() => orelMazeImportAdapter.import(text)).toThrow(/00 to 15/)
  })
})

describe('Alice maze details', () => {
  const text = readFileSync(join(MAZES_DIR, '1_-_alice_in_wonderland.maze'), 'utf-8')
  const doc = orelMazeImportAdapter.import(text)
  const def = doc.definition as SquareRecursiveDefinition

  it('has correct grid dimensions (13 rows × 13 cols)', () => {
    expect(def.grid.rows).toBe(13)
    expect(def.grid.cols).toBe(13)
  })

  it('has 4 blocks (A, B, C, D)', () => {
    expect(def.blocks.length).toBe(4)
    expect(def.blocks.map((b) => b.name).sort()).toEqual(['A', 'B', 'C', 'D'])
  })

  it('has 12 exits', () => {
    expect(def.exits.length).toBe(12)
  })

  it('has correct player position', () => {
    expect(def.player.row).toBe(1)
    expect(def.player.col).toBe(1)
  })

  it('passes validation', () => {
    const result = validateMaze(doc)
    expect(result.valid).toBe(true)
    const errors = result.issues.filter((i) => i.severity === 'error')
    expect(errors).toHaveLength(0)
  })
})

describe('.fmaze canonical round-trip', () => {
  for (const filename of MAZE_FILES) {
    it(`round-trips ${filename} through .fmaze`, () => {
      const text = readFileSync(join(MAZES_DIR, filename), 'utf-8')
      const doc = orelMazeImportAdapter.import(text)
      const fmazeStr = fmazeExportAdapter.export(doc)
      expect(fmazeImportAdapter.canImport(fmazeStr)).toBe(true)
      const docBack = fmazeImportAdapter.import(fmazeStr)
      expect(docBack.formatVersion).toBe('1.0')
      const defOrig = doc.definition as SquareRecursiveDefinition
      const defBack = docBack.definition as SquareRecursiveDefinition
      expect(defBack.grid.rows).toBe(defOrig.grid.rows)
      expect(defBack.grid.cols).toBe(defOrig.grid.cols)
      expect(defBack.grid.cells).toEqual(defOrig.grid.cells)
      expect(defBack.blocks.length).toBe(defOrig.blocks.length)
      expect(defBack.exits.length).toBe(defOrig.exits.length)
      expect(defBack.links.length).toBe(defOrig.links.length)
    })
  }
})

describe('Orel .maze export round-trip', () => {
  it('exports alice maze back to .maze format and re-imports correctly', () => {
    const text = readFileSync(join(MAZES_DIR, '1_-_alice_in_wonderland.maze'), 'utf-8')
    const doc = orelMazeImportAdapter.import(text)
    const exported = orelMazeExportAdapter.export(doc)
    expect(typeof exported).toBe('string')
    expect(exported).toContain('TILE_SIZE')
    expect(exported).toContain('BLOCK A')
    const docBack = orelMazeImportAdapter.import(exported)
    const defOrig = doc.definition as SquareRecursiveDefinition
    const defBack = docBack.definition as SquareRecursiveDefinition
    expect(defBack.grid.cells).toEqual(defOrig.grid.cells)
    expect(defBack.blocks.length).toBe(defOrig.blocks.length)
  })
})

describe('Validator', () => {
  it('all 9 bundled mazes pass validation', () => {
    for (const filename of MAZE_FILES) {
      const text = readFileSync(join(MAZES_DIR, filename), 'utf-8')
      const doc = orelMazeImportAdapter.import(text)
      const result = validateMaze(doc)
      const errors = result.issues.filter((i) => i.severity === 'error')
      expect(errors, `${filename} has errors: ${errors.map((e) => e.message).join(', ')}`).toHaveLength(0)
    }
  })
})
