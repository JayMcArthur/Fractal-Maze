/**
 * Zustand player slice.
 * Manages current maze session: position, history, win state, visited cells.
 */
import { advanceSquarePDA, type SquarePDA } from '../../core/play/squarePDA'
import { squarePlayPDA } from '../library/playPDA'
import { create } from 'zustand'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { PlayerPosition, PlayerAction } from '../../core/model/playerState'
import type { SquareRecursiveDefinition } from '../../core/model/squareRecursive'
import type { DirectionBit } from '../../core/model/squareRecursive'
import type { BlockRecursiveDefinition } from '../../core/model/blockRecursive'
import { resolveMove } from '../../core/solver/common/movementResolver'
import { appendTrail } from '../../core/replay/replayFrame'
import { appendRouteAction } from '../../core/replay/routeHistory'
import { buildReplay } from '../../core/replay/replayWriter'
import { saveReplay } from '../projects/db'
import type { ReplayRecord } from '../projects/db'

export interface PlayerState {
  // Current session
  doc: RecursiveMazeDocument | null
  pda: SquarePDA | null
  position: PlayerPosition
  history: PlayerAction[]
  isWon: boolean
  sessionStartMs: number
  completedAtMs: number | null
  startedAt: string
  lastActionId: number
  lastActionType: PlayerAction['type'] | 'undo' | null

  // Breadcrumb trail as path-stack (backtracking pops the stack)
  pathStack: PlayerPosition[]

  // Actions
  loadMaze: (doc: RecursiveMazeDocument) => void
  move: (direction: DirectionBit) => void
  reset: () => void
  saveReplay: () => Promise<string | undefined>
  undo: () => void
}

const initialPosition: PlayerPosition = { blockStack: ['0'], row: 0, col: 0 }

function initialPositionFor(doc: RecursiveMazeDocument): PlayerPosition {
  if (doc.representationType === 'squareRecursive') {
    const def = doc.definition as SquareRecursiveDefinition
    return { blockStack: ['0'], row: def.player.row, col: def.player.col }
  }
  if (doc.representationType === 'blockRecursive') {
    const def = doc.definition as BlockRecursiveDefinition
    return { blockStack: ['0'], row: def.start?.[1] ?? 0, col: def.start?.[0] ?? 0 }
  }
  return initialPosition
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  doc: null,
  pda: null,
  position: initialPosition,
  history: [],
  isWon: false,
  sessionStartMs: Date.now(),
  completedAtMs: null,
  startedAt: new Date().toISOString(),
  lastActionId: 0,
  lastActionType: null,
  pathStack: [initialPosition],

  loadMaze(doc: RecursiveMazeDocument) {
    const startPos = initialPositionFor(doc)
    const pda = doc.definition.type === 'squareRecursive' ? squarePlayPDA(doc) : null
    set({
      doc,
      pda,
      position: startPos,
      history: [],
      isWon: false,
      sessionStartMs: Date.now(),
      completedAtMs: null,
      startedAt: new Date().toISOString(),
      lastActionId: 0,
      lastActionType: null,
      pathStack: [startPos],
    })
  },

  move(direction: DirectionBit) {
    const { doc, position, history, isWon, sessionStartMs, pathStack, lastActionId } = get()
    if (!doc || isWon || doc.representationType !== 'squareRecursive') return
    const def = doc.definition as SquareRecursiveDefinition

    const result = resolveMove(def, position, direction, sessionStartMs)
    if (!result) return

    const pda = get().pda!
    const logical = advanceSquarePDA(pda, result.action)
    result.newPos.blockStack = ['0', ...logical.address]
    const newPath = appendTrail(pathStack, result.newPos)

    set({
      position: result.newPos,
      history: appendRouteAction(history, result.action),
      isWon: result.isWin,
      completedAtMs: result.isWin ? Date.now() : null,
      pathStack: newPath,
      lastActionId: lastActionId + 1,
      lastActionType: result.action.type,
    })
  },

  reset() {
    const { doc } = get()
    if (!doc) return
    const startPos = initialPositionFor(doc)
    set({
      position: startPos,
      history: [],
      isWon: false,
      sessionStartMs: Date.now(),
      completedAtMs: null,
      startedAt: new Date().toISOString(),
      lastActionId: 0,
      lastActionType: null,
      pathStack: [startPos],
    })
  },

  async saveReplay() {
    const { doc, history, isWon, startedAt } = get()
    if (!doc || doc.representationType !== 'squareRecursive') return
    const status = isWon ? 'complete' : 'partial'
    const replayDoc = buildReplay(doc, history, status, startedAt, 'human')
    const record: ReplayRecord = {
      id: crypto.randomUUID(),
      mazeId: doc.metadata.id,
      mazeTitle: doc.metadata.title,
      doc: replayDoc,
      createdAt: new Date().toISOString(),
    }
    await saveReplay(record)
    return record.id
  },

  undo() {
    const { doc, history, pathStack, lastActionId } = get()
    if (!doc || doc.representationType !== 'squareRecursive' || history.length === 0) return

    const idx = history.length - 1

    const prevPos = history[idx].from
    const newHistory = history.slice(0, idx)
    const newPath = appendTrail(pathStack, prevPos)

    set({
      position: prevPos,
      history: newHistory,
      isWon: false,
      completedAtMs: null,
      pathStack: newPath,
      lastActionId: lastActionId + 1,
      lastActionType: 'undo',
    })
  },
}))
