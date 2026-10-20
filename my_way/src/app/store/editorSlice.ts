/**
 * Zustand editor slice.
 * Manages the maze being edited: full document state + undo/redo history.
 * Uses simple immutable snapshots (command pattern via state array).
 */
import { create } from 'zustand'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type {
  SquareRecursiveDefinition,
  TileBlock,
  TileLink,
  TileExit,
  Teleporter,
} from '../../core/model/squareRecursive'
import { defaultRenderConfig } from '../../core/model/renderConfig'
import { defaultSolverConfig } from '../../core/model/solverInterface'

export type EditorMode = 'structure' | 'blocks' | 'links' | 'player' | 'metadata'

export interface EditorState {
  doc: RecursiveMazeDocument | null
  mode: EditorMode
  selectedBlock: string | null

  // Undo/redo stacks (store serialized documents)
  undoStack: string[]
  redoStack: string[]

  // Actions
  newMaze: (rows?: number, cols?: number) => void
  loadDoc: (doc: RecursiveMazeDocument) => void
  setMode: (mode: EditorMode) => void
  selectBlock: (name: string | null) => void

  // Structure editing
  toggleWall: (row: number, col: number, dirBit: number) => void
  resizeGrid: (rows: number, cols: number) => void

  // Block editing
  addBlock: (block: TileBlock) => void
  updateBlock: (name: string, updates: Partial<TileBlock>) => void
  removeBlock: (name: string) => void

  // Link / Exit editing
  setLink: (link: TileLink) => void
  removeLink: (row: number, col: number) => void
  setExit: (exit: TileExit) => void
  removeExit: (name: string) => void

  // Teleporter editing
  setTeleporter: (t: Teleporter) => void
  removeTeleporter: (row: number, col: number, dir: number) => void

  // Player / Trophy
  setPlayerPos: (row: number, col: number) => void
  addTrophy: (row: number, col: number, color?: string) => void
  removeTrophy: (row: number, col: number) => void

  // Metadata
  updateMetadata: (updates: Partial<RecursiveMazeDocument['metadata']>) => void

  // Undo/redo
  undo: () => void
  redo: () => void
}

function createEmptyDoc(rows = 7, cols = 7): RecursiveMazeDocument {
  const now = new Date().toISOString()
  return {
    formatVersion: '1.0',
    metadata: {
      id: crypto.randomUUID(),
      title: 'New Maze',
      tags: [],
      createdAt: now,
      updatedAt: now,
    },
    representationType: 'squareRecursive',
    definition: {
      type: 'squareRecursive',
      tileSize: 48,
      colors: { outside: '#1a1a2e', background: '#16213e', path: '#0f3460', line: '#e94560' },
      grid: { rows, cols, cells: new Array(rows * cols).fill(0) },
      blocks: [],
      links: [],
      exits: [],
      teleporters: [],
      player: { row: 0, col: 0, color: '#e94560' },
      trophies: [],
    } as SquareRecursiveDefinition,
    renderConfig: { ...defaultRenderConfig },
    solverConfig: { ...defaultSolverConfig },
    annotations: [],
  }
}

function cloneDef(def: SquareRecursiveDefinition): SquareRecursiveDefinition {
  return JSON.parse(JSON.stringify(def))
}

function withDef(
  doc: RecursiveMazeDocument,
  fn: (def: SquareRecursiveDefinition) => SquareRecursiveDefinition
): RecursiveMazeDocument {
  const newDef = fn(cloneDef(doc.definition as SquareRecursiveDefinition))
  return {
    ...doc,
    definition: newDef,
    metadata: { ...doc.metadata, updatedAt: new Date().toISOString() },
  }
}

const MAX_UNDO = 50

export const useEditorStore = create<EditorState>((set, get) => {
  function pushUndo() {
    const { doc, undoStack } = get()
    if (!doc) return
    const snapshot = JSON.stringify(doc)
    const newStack = [...undoStack, snapshot].slice(-MAX_UNDO)
    set({ undoStack: newStack, redoStack: [] })
  }

  function updateDoc(updater: (doc: RecursiveMazeDocument) => RecursiveMazeDocument) {
    pushUndo()
    const { doc } = get()
    if (!doc) return
    set({ doc: updater(doc) })
  }

  return {
    doc: null,
    mode: 'structure',
    selectedBlock: null,
    undoStack: [],
    redoStack: [],

    newMaze(rows = 7, cols = 7) {
      set({
        doc: createEmptyDoc(rows, cols),
        mode: 'structure',
        selectedBlock: null,
        undoStack: [],
        redoStack: [],
      })
    },

    loadDoc(doc) {
      set({ doc, undoStack: [], redoStack: [] })
    },

    setMode(mode) {
      set({ mode })
    },
    selectBlock(name) {
      set({ selectedBlock: name })
    },

    toggleWall(row, col, dirBit) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          const idx = row * def.grid.cols + col
          def.grid.cells[idx] ^= dirBit
          // Mirror: if toggling N on (row,col), also toggle S on (row-1,col)
          const [dr, dc] =
            dirBit === 8 ? [-1, 0] : dirBit === 2 ? [1, 0] : dirBit === 4 ? [0, 1] : [0, -1]
          const mirrorBit = dirBit === 8 ? 2 : dirBit === 2 ? 8 : dirBit === 4 ? 1 : 4
          const nr = row + dr
          const nc = col + dc
          if (nr >= 0 && nr < def.grid.rows && nc >= 0 && nc < def.grid.cols) {
            def.grid.cells[nr * def.grid.cols + nc] ^= mirrorBit
          }
          return def
        })
      )
    },

    resizeGrid(rows, cols) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          const newCells = new Array(rows * cols).fill(0)
          const minR = Math.min(rows, def.grid.rows)
          const minC = Math.min(cols, def.grid.cols)
          for (let r = 0; r < minR; r++) {
            for (let c = 0; c < minC; c++) {
              newCells[r * cols + c] = def.grid.cells[r * def.grid.cols + c]
            }
          }
          def.grid = { rows, cols, cells: newCells }
          return def
        })
      )
    },

    addBlock(block) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.blocks = [...def.blocks, block]
          return def
        })
      )
    },

    updateBlock(name, updates) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.blocks = def.blocks.map((b) => (b.name === name ? { ...b, ...updates } : b))
          return def
        })
      )
    },

    removeBlock(name) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.blocks = def.blocks.filter((b) => b.name !== name)
          def.links = def.links.filter((l) => !l.blockPath.includes(name))
          return def
        })
      )
    },

    setLink(link) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          // Replace existing link at same cell if present
          const filtered = def.links.filter((l) => !(l.row === link.row && l.col === link.col))
          def.links = [...filtered, link]
          return def
        })
      )
    },

    removeLink(row, col) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.links = def.links.filter((l) => !(l.row === row && l.col === col))
          return def
        })
      )
    },

    setExit(exit) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          const filtered = def.exits.filter((e) => e.name !== exit.name)
          def.exits = [...filtered, exit]
          return def
        })
      )
    },

    removeExit(name) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.exits = def.exits.filter((e) => e.name !== name)
          def.links = def.links.filter((l) => l.exitName !== name)
          return def
        })
      )
    },

    setTeleporter(t) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          const filtered = def.teleporters.filter(
            (x) => !(x.row === t.row && x.col === t.col && x.direction === t.direction)
          )
          def.teleporters = [...filtered, t]
          return def
        })
      )
    },

    removeTeleporter(row, col, dir) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.teleporters = def.teleporters.filter(
            (t) => !(t.row === row && t.col === col && t.direction === dir)
          )
          return def
        })
      )
    },

    setPlayerPos(row, col) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.player = { ...def.player, row, col }
          return def
        })
      )
    },

    addTrophy(row, col, color = '#ffd700') {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.trophies = [
            ...def.trophies.filter((t) => !(t.row === row && t.col === col)),
            { row, col, color },
          ]
          return def
        })
      )
    },

    removeTrophy(row, col) {
      updateDoc((doc) =>
        withDef(doc, (def) => {
          def.trophies = def.trophies.filter((t) => !(t.row === row && t.col === col))
          return def
        })
      )
    },

    updateMetadata(updates) {
      pushUndo()
      const { doc } = get()
      if (!doc) return
      set({
        doc: {
          ...doc,
          metadata: { ...doc.metadata, ...updates, updatedAt: new Date().toISOString() },
        },
      })
    },

    undo() {
      const { doc, undoStack, redoStack } = get()
      if (!doc || undoStack.length === 0) return
      const prev = undoStack[undoStack.length - 1]
      const currentSnapshot = JSON.stringify(doc)
      set({
        doc: JSON.parse(prev) as RecursiveMazeDocument,
        undoStack: undoStack.slice(0, -1),
        redoStack: [currentSnapshot, ...redoStack].slice(0, MAX_UNDO),
      })
    },

    redo() {
      const { doc, undoStack, redoStack } = get()
      if (!doc || redoStack.length === 0) return
      const next = redoStack[0]
      const currentSnapshot = JSON.stringify(doc)
      set({
        doc: JSON.parse(next) as RecursiveMazeDocument,
        undoStack: [...undoStack, currentSnapshot].slice(-MAX_UNDO),
        redoStack: redoStack.slice(1),
      })
    },
  }
})
