/**
 * Tests for the replay system (Sprint 7).
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { buildReplay } from '../core/replay/replayWriter'
import { useReplayStore } from '../app/store/replaySlice'
import type { PlayerAction, PlayerPosition } from '../core/model/playerState'
import type { RecursiveMazeDocument } from '../core/model/RecursiveMazeDocument'

// Minimal maze doc for testing
const minimalDoc: RecursiveMazeDocument = {
  formatVersion: '1.0',
  metadata: {
    id: 'test-maze',
    title: 'Test Maze',
    tags: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  representationType: 'squareRecursive',
  definition: {
    type: 'squareRecursive',
    tileSize: 32,
    colors: { outside: '#000', background: '#fff', path: '#ccc', line: '#f00' },
    grid: { rows: 5, cols: 5, cells: new Array(25).fill(0) },
    blocks: [],
    links: [],
    exits: [],
    teleporters: [],
    player: { row: 0, col: 0, color: '#00f' },
    trophies: [],
  },
  renderConfig: {
    preferredRenderer: 'canvas',
    maxDepth: 2,
    showBreadcrumbs: true,
    showBlockLabels: true,
    animationSpeed: 'normal',
  },
  solverConfig: {
    maxDepth: 5,
    maxNodes: 1000,
    timeoutMs: 1000,
    strategy: 'bfs',
  },
  annotations: [],
}

const pos0: PlayerPosition = { blockStack: ['0'], row: 0, col: 0 }
const pos1: PlayerPosition = { blockStack: ['0'], row: 0, col: 1 }
const pos2: PlayerPosition = { blockStack: ['0'], row: 1, col: 1 }
const posNested: PlayerPosition = { blockStack: ['0', 'A'], row: 1, col: 1 }

const actions: PlayerAction[] = [
  { type: 'move', from: pos0, to: pos1, direction: 4, timestamp: 0 },
  { type: 'enterBlock', from: pos1, to: posNested, direction: 2, timestamp: 100, blockName: 'A' },
  { type: 'exitBlock', from: posNested, to: pos1, direction: 8, timestamp: 200, blockName: 'A' },
  { type: 'move', from: pos1, to: pos2, direction: 2, timestamp: 300 },
  { type: 'checkpoint', from: pos2, to: pos2, timestamp: 400, note: 'halfway' },
]

describe('buildReplay', () => {
  it('preserves an immutable maze snapshot when the edited maze changes later', () => {
    const maze = structuredClone(minimalDoc)
    const replay = buildReplay(maze, actions, 'partial', '2024-01-01T00:00:00.000Z', 'human')
    maze.metadata.title = 'Changed title'
    expect(replay.maze.metadata.title).toBe('Test Maze')
    expect(replay.maze.definition).toEqual(minimalDoc.definition)
  })
  it('creates a valid ReplayDocument', () => {
    const startedAt = '2024-01-01T00:00:00.000Z'
    const replay = buildReplay(minimalDoc, actions, 'complete', startedAt, 'human')

    expect(replay.formatVersion).toBe('1.0')
    expect(replay.mazeRef).toBe('test-maze')
    expect(replay.mazeTitle).toBe('Test Maze')
    expect(replay.status).toBe('complete')
    expect(replay.startedAt).toBe(startedAt)
    expect(replay.endedAt).toBeDefined()
  })

  it('computes totalMoves correctly', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    // The nested detour returns to pos1 and is removed.
    expect(replay.metrics.totalMoves).toBe(2)
  })

  it('does not collect obsolete backtrack counts', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    expect(replay.metrics).not.toHaveProperty('backtracks')
  })

  it('derivedPath is non-empty for a complete replay', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    expect(replay.derivedPath.length).toBeGreaterThan(0)
    // derivedPath contains .to positions of movement actions
    expect(replay.derivedPath[0]).toEqual(pos1)
  })

  it('computes totalTime correctly', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    // timestamps: 0, 100, 200, 300 — first is 0, last is 300
    expect(replay.metrics.totalTime).toBe(300)
  })

  it('computes maxDepthReached correctly', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    // The removed detour no longer contributes to the saved route depth.
    expect(replay.metrics.maxDepthReached).toBe(0)
  })

  it('checkpoints array contains indices of checkpoint actions', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    expect(replay.checkpoints).toEqual([2]) // index after removing the detour
  })

  it('handles empty actions', () => {
    const replay = buildReplay(minimalDoc, [], 'partial', '2024-01-01T00:00:00.000Z', 'human')
    expect(replay.metrics.totalMoves).toBe(0)
    expect(replay.metrics.totalTime).toBe(0)
    expect(replay.derivedPath).toEqual([])
  })
})

describe('replaySlice', () => {
  beforeEach(() => {
    useReplayStore.setState({
      doc: null,
      currentStep: 0,
      isPlaying: false,
      speed: 1,
      currentPosition: { blockStack: ['0'], row: 0, col: 0 },
      trail: [],
    })
  })

  it('loadReplay sets the doc and resets step to 0', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)

    const state = useReplayStore.getState()
    expect(state.doc).toBe(replay)
    expect(state.currentStep).toBe(0)
    expect(state.isPlaying).toBe(false)
    expect(state.currentPosition).toEqual(pos0)
  })

  it('stepForward advances the step', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)
    useReplayStore.getState().stepForward()

    const state = useReplayStore.getState()
    expect(state.currentStep).toBe(1)
  })

  it('stepBack decrements the step', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)
    useReplayStore.getState().stepForward()
    useReplayStore.getState().stepForward()
    useReplayStore.getState().stepBack()

    const state = useReplayStore.getState()
    expect(state.currentStep).toBe(1)
  })

  it('stepBack at step 0 stays at 0', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)
    useReplayStore.getState().stepBack()

    expect(useReplayStore.getState().currentStep).toBe(0)
  })

  it('seekTo clamps to valid range', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)
    useReplayStore.getState().seekTo(100)

    const state = useReplayStore.getState()
    expect(state.currentStep).toBe(replay.actions.length)
  })

  it('seekTo sets step to specified value', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)
    useReplayStore.getState().seekTo(3)

    expect(useReplayStore.getState().currentStep).toBe(3)
  })

  it('currentPosition updates when stepping', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)
    useReplayStore.getState().stepForward()

    const state = useReplayStore.getState()
    // The first step applies the first action from the recorded initial position.
    expect(state.currentPosition).toEqual(replay.actions[0].to)
  })

  it('play/pause toggle isPlaying', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)

    useReplayStore.getState().play()
    expect(useReplayStore.getState().isPlaying).toBe(true)

    useReplayStore.getState().pause()
    expect(useReplayStore.getState().isPlaying).toBe(false)
  })

  it('setSpeed updates speed', () => {
    useReplayStore.getState().setSpeed(2)
    expect(useReplayStore.getState().speed).toBe(2)
  })

  it('scrubs the trimmed route and can restart playback from its last frame', () => {
    const replay = buildReplay(minimalDoc, actions, 'complete', '2024-01-01T00:00:00.000Z', 'human')
    useReplayStore.getState().loadReplay(replay)
    useReplayStore.getState().seekTo(2)
    expect(useReplayStore.getState().trail).toEqual([pos0, pos1, pos2])
    useReplayStore.getState().seekTo(3)
    expect(useReplayStore.getState().trail).toEqual([pos0, pos1, pos2])
    useReplayStore.getState().seekTo(actions.length)
    expect(useReplayStore.getState().currentPosition).toEqual(pos2)
    expect(useReplayStore.getState().isPlaying).toBe(false)
    useReplayStore.getState().play()
    expect(useReplayStore.getState().currentStep).toBe(0)
    expect(useReplayStore.getState().currentPosition).toEqual(pos0)
  })
})
