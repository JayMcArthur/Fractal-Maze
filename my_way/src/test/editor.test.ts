import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../app/store/editorSlice'
import type { SquareRecursiveDefinition } from '../core/model/squareRecursive'

// Shorthand: get current def from store
const getDef = () =>
  useEditorStore.getState().doc!.definition as SquareRecursiveDefinition

beforeEach(() => {
  useEditorStore.getState().newMaze(5, 5)
})

describe('EditorStore', () => {
  it('creates a new empty 5×5 maze', () => {
    const def = getDef()
    expect(def.grid.rows).toBe(5)
    expect(def.grid.cols).toBe(5)
    expect(def.grid.cells.every((c) => c === 0)).toBe(true)
    expect(def.blocks).toHaveLength(0)
    expect(def.exits).toHaveLength(0)
  })

  it('toggleWall sets a path bit and mirrors it', () => {
    useEditorStore.getState().toggleWall(1, 1, 8) // N at (1,1) ↔ S at (0,1)
    const def = getDef()
    expect(def.grid.cells[1 * 5 + 1] & 8).toBe(8)  // N bit set at (1,1)
    expect(def.grid.cells[0 * 5 + 1] & 2).toBe(2)  // S mirror set at (0,1)
  })

  it('toggleWall twice clears the bit', () => {
    useEditorStore.getState().toggleWall(2, 2, 4) // East
    useEditorStore.getState().toggleWall(2, 2, 4)
    expect(getDef().grid.cells[2 * 5 + 2] & 4).toBe(0)
  })

  it('addBlock and removeBlock', () => {
    useEditorStore.getState().addBlock({ name: 'A', row: 0, col: 0, width: 2, height: 2, color: '#fff' })
    expect(getDef().blocks).toHaveLength(1)
    useEditorStore.getState().removeBlock('A')
    expect(getDef().blocks).toHaveLength(0)
  })

  it('undo reverses a wall toggle', () => {
    useEditorStore.getState().toggleWall(0, 0, 4)
    expect(getDef().grid.cells[0] & 4).toBe(4)
    useEditorStore.getState().undo()
    expect(getDef().grid.cells[0] & 4).toBe(0)
  })

  it('redo re-applies a wall toggle after undo', () => {
    useEditorStore.getState().toggleWall(0, 0, 4)
    useEditorStore.getState().undo()
    useEditorStore.getState().redo()
    expect(getDef().grid.cells[0] & 4).toBe(4)
  })

  it('updateMetadata changes the title', () => {
    useEditorStore.getState().updateMetadata({ title: 'My Test Maze' })
    expect(useEditorStore.getState().doc!.metadata.title).toBe('My Test Maze')
  })

  it('setExit and removeExit', () => {
    useEditorStore.getState().setExit({ name: 'X1', direction: 8, row: 0, col: 0 })
    expect(getDef().exits).toHaveLength(1)
    useEditorStore.getState().removeExit('X1')
    expect(getDef().exits).toHaveLength(0)
  })

  it('resizeGrid preserves existing cells', () => {
    useEditorStore.getState().toggleWall(0, 0, 4) // set E bit at (0,0)
    useEditorStore.getState().resizeGrid(8, 8)
    const def = getDef()
    expect(def.grid.rows).toBe(8)
    expect(def.grid.cols).toBe(8)
    // Cell (0,0) should still have the E bit (and its mirror W at (0,1))
    expect(def.grid.cells[0] & 4).toBe(4)
  })
})

it('undo and redo restore metadata together with structure', () => {
  const store = useEditorStore.getState()
  store.updateMetadata({ title: 'Renamed' })
  store.toggleWall(0, 0, 4)
  store.undo()
  expect(useEditorStore.getState().doc!.metadata.title).toBe('Renamed')
  store.undo()
  expect(useEditorStore.getState().doc!.metadata.title).toBe('New Maze')
  store.redo()
  expect(useEditorStore.getState().doc!.metadata.title).toBe('Renamed')
})
