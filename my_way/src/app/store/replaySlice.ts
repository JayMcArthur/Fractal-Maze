import { create } from 'zustand'
import type { ReplayDocument } from '../../core/replay/ReplayDocument'
import type { PlayerPosition } from '../../core/model/playerState'
import { replayStepCount } from '../../core/replay/nativeReplay'
import { replayFrame } from '../../core/replay/replayFrame'

export interface ReplayState {
  doc: ReplayDocument | null
  currentStep: number
  isPlaying: boolean
  animateStep: boolean
  speed: 0.5 | 1 | 2 | 10
  currentPosition: PlayerPosition
  trail: PlayerPosition[]
  loadReplay(replayDoc: ReplayDocument): void
  play(): void
  pause(): void
  stepForward(): void
  stepBack(): void
  seekTo(step: number): void
  setSpeed(s: ReplayState['speed']): void
}

export const useReplayStore = create<ReplayState>((set, get) => {
  const selectStep = (step: number, animateStep: boolean) => {
    const { doc } = get()
    if (!doc) return
    const currentStep = Math.max(0, Math.min(step, replayStepCount(doc)))
    set({ currentStep, animateStep, ...replayFrame(doc, currentStep),
      ...(currentStep === replayStepCount(doc) ? { isPlaying: false } : {}) })
  }
  return {
    doc: null,
    currentStep: 0,
    isPlaying: false,
    animateStep: false,
    speed: 1,
    currentPosition: { blockStack: ['0'], row: 0, col: 0 },
    trail: [],
    loadReplay(doc) {
      set({ doc, currentStep: 0, isPlaying: false, animateStep: false, ...replayFrame(doc, 0) })
    },
    play() {
      const { doc, currentStep } = get()
      if (!doc || !replayStepCount(doc)) return
      if (currentStep === replayStepCount(doc)) get().seekTo(0)
      set({ isPlaying: true })
    },
    pause() {
      set({ isPlaying: false })
    },
    stepForward() {
      selectStep(get().currentStep + 1, true)
    },
    stepBack() {
      selectStep(get().currentStep - 1, false)
    },
    seekTo(step) {
      selectStep(step, false)
    },
    setSpeed(speed) {
      set({ speed })
    },
  }
})
