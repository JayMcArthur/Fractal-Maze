import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'

export interface ImportAdapter {
  formatName: string
  fileExtensions: string[]
  canImport(raw: string | object): boolean
  import(raw: string | object): RecursiveMazeDocument
  importCollection?(raw: string | object): RecursiveMazeDocument[]
}

export interface ExportAdapter {
  formatName: string
  fileExtension: string
  export(doc: RecursiveMazeDocument): string
}
