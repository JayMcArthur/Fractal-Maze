/**
 * Auto-detect which import adapter can handle a given raw string/object.
 * Tries adapters in priority order and returns the first match.
 */
import type { ImportAdapter } from './AdapterInterface'
import { fmazeImportAdapter } from './adapters/fmazeAdapter'
import { orelMazeImportAdapter } from './adapters/orelMazeAdapter'
import { amurielagiImportAdapter } from './adapters/amurielagiAdapter'
import { koteitanImportAdapter } from './adapters/koteitanAdapter'
import { repeatedImportAdapter } from './adapters/repeatedAdapter'
import { pathPDAImportAdapter } from './adapters/pathPDAAdapter'

export const ALL_IMPORT_ADAPTERS: ImportAdapter[] = [
  fmazeImportAdapter,       // check canonical first — most specific
  pathPDAImportAdapter,
  amurielagiImportAdapter,  // FRACTAL-MAZE.v2 JSON
  koteitanImportAdapter,    // fractal block JSON
  repeatedImportAdapter,
  orelMazeImportAdapter,    // .maze text fallback
]

export function detectAdapter(raw: string | object): ImportAdapter | null {
  for (const adapter of ALL_IMPORT_ADAPTERS) {
    if (adapter.canImport(raw)) return adapter
  }
  return null
}
