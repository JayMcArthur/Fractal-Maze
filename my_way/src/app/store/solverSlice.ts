/**
 * Zustand solver slice.
 * Manages solver state and web worker communication.
 */
import { create } from 'zustand'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { SolverConfig, SolverEvent, SolverStatus } from '../../core/model/solverInterface'
import type { PlayerAction, PlayerPosition } from '../../core/model/playerState'
import { defaultSolverConfig } from '../../core/model/solverInterface'

export interface SolverState {
  status: SolverStatus
  nodesExplored: number
  depth: number
  frontier: PlayerPosition[]
  foundPath: PlayerAction[] | null
  config: SolverConfig
  errorMessage: string | null

  startSolve(doc: RecursiveMazeDocument): void
  cancelSolve(): void
  setConfig(c: Partial<SolverConfig>): void
}

let workerInstance: Worker | null = null

export const useSolverStore = create<SolverState>((set, get) => ({
  status: 'idle',
  nodesExplored: 0,
  depth: 0,
  frontier: [],
  foundPath: null,
  config: { ...defaultSolverConfig },
  errorMessage: null,

  startSolve(doc: RecursiveMazeDocument) {
    // Cancel any existing worker
    if (workerInstance) {
      workerInstance.postMessage({ type: 'cancel' })
      workerInstance.terminate()
      workerInstance = null
    }

    set({
      status: 'running',
      nodesExplored: 0,
      depth: 0,
      frontier: [],
      foundPath: null,
      errorMessage: null,
    })

    const { config } = get()

    const worker = new Worker(
      new URL('../../../src/core/workers/solverWorker.ts', import.meta.url),
      { type: 'module' }
    )
    workerInstance = worker

    worker.onmessage = (e: MessageEvent<SolverEvent>) => {
      if (workerInstance !== worker) return
      const event = e.data
      switch (event.type) {
        case 'progress':
          set({
            nodesExplored: event.nodesExplored,
            depth: event.depth,
            frontier: event.frontier ?? [],
          })
          break
        case 'solved':
          set({
            status: 'solved',
            nodesExplored: event.nodesExplored,
            depth: event.depth,
            foundPath: event.path ?? null,
            frontier: [],
          })
          worker.terminate()
          workerInstance = null
          break
        case 'unsolvable':
          set({
            status: event.message === 'timeout' ? 'timeout' : 'unsolvable',
            nodesExplored: event.nodesExplored,
            depth: event.depth,
            errorMessage: event.message ?? null,
          })
          worker.terminate()
          workerInstance = null
          break
        case 'error':
          set({
            status: 'unsolvable',
            errorMessage: event.message ?? 'Unknown error',
          })
          worker.terminate()
          workerInstance = null
          break
      }
    }

    worker.onerror = (err) => {
      if (workerInstance !== worker) return
      worker.terminate()
      set({ status: 'unsolvable', errorMessage: err.message })
      workerInstance = null
    }

    worker.postMessage({ type: 'solve', doc, config })
  },

  cancelSolve() {
    if (workerInstance) {
      workerInstance.postMessage({ type: 'cancel' })
      workerInstance.terminate()
      workerInstance = null
    }
    set({ status: 'idle' })
  },

  setConfig(c: Partial<SolverConfig>) {
    set((state) => ({ config: { ...state.config, ...c } }))
  },
}))
