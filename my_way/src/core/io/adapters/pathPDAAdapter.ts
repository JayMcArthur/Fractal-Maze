import type { ImportAdapter } from '../AdapterInterface'
import { importPathPDA } from '../../pathMaze/importPDA'
import { defaultRenderConfig } from '../../model/renderConfig'
import { defaultSolverConfig } from '../../model/solverInterface'

export const pathPDAImportAdapter: ImportAdapter = {
  formatName: 'Path PDA JSON',
  fileExtensions: ['.pda.json', '.json'],
  canImport(raw) {
    try {
      return (typeof raw === 'string' ? JSON.parse(raw) : raw)?.format === 'path-pda/1'
    } catch { return false }
  },
  import(raw) {
    const { model: definition, title } = importPathPDA(raw), now = new Date().toISOString()
    return {
      formatVersion: '1.0', representationType: definition.type, definition,
      metadata: { id: crypto.randomUUID(), title: title ?? 'Imported path PDA',
        tags: ['paths', 'pda'], createdAt: now, updatedAt: now },
      renderConfig: { ...defaultRenderConfig }, solverConfig: { ...defaultSolverConfig },
      annotations: [],
    }
  },
}
