/**
 * Zustand slice for tracking a maze document that was just imported (or shared via URL).
 * Other pages can read from this to load the imported maze.
 */
import { create } from 'zustand'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'

interface ImportState {
  pendingDoc: RecursiveMazeDocument | null
  setPendingDoc: (doc: RecursiveMazeDocument | null) => void
}

export const useImportStore = create<ImportState>((set) => ({
  pendingDoc: null,
  setPendingDoc: (doc) => set({ pendingDoc: doc }),
}))
