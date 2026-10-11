/**
 * Canonical `.fmaze` format — JSON serialization of RecursiveMazeDocument.
 * This is the lossless round-trip format for all maze families.
 */
import type { ImportAdapter, ExportAdapter } from '../AdapterInterface'
import type { RecursiveMazeDocument } from '../../model/RecursiveMazeDocument'

export const fmazeImportAdapter: ImportAdapter = {
  formatName: '.fmaze canonical',
  fileExtensions: ['.fmaze', '.fmaze.json'],

  canImport(raw: string | object): boolean {
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
      return obj?.formatVersion === '1.0' && typeof obj?.representationType === 'string'
    } catch {
      return false
    }
  },

  import(raw: string | object): RecursiveMazeDocument {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!this.canImport(obj)) {
      throw new Error('Not a valid .fmaze document (missing formatVersion or representationType)')
    }
    return obj as RecursiveMazeDocument
  },
}

export const fmazeExportAdapter: ExportAdapter = {
  formatName: '.fmaze canonical',
  fileExtension: '.fmaze',

  export(doc: RecursiveMazeDocument): string {
    return JSON.stringify(doc, null, 2)
  },
}
