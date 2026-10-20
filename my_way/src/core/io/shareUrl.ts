/**
 * Share URL encoding: base64-encode a compressed .fmaze document into a URL param.
 * Only practical for small mazes (grid ≤ ~15×15, few blocks).
 */
import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'
import { fmazeExportAdapter, fmazeImportAdapter } from './adapters/fmazeAdapter'
import { validateMaze } from '../validate/validateMaze'

const SHARE_PARAM = 'maze'
const MAX_SHARE_BYTES = 8000 // URL length safety limit

export function encodeShareUrl(doc: RecursiveMazeDocument, baseUrl: string): string | null {
  try {
    const json = fmazeExportAdapter.export(doc)
    const encoded = btoa(encodeURIComponent(json))
    if (encoded.length > MAX_SHARE_BYTES) return null
    const url = new URL(baseUrl)
    url.searchParams.set(SHARE_PARAM, encoded)
    return url.toString()
  } catch {
    return null
  }
}

export function decodeShareUrl(urlOrSearch: string): RecursiveMazeDocument | null {
  try {
    const search = urlOrSearch.includes('?') ? urlOrSearch.split('?')[1] : urlOrSearch
    const params = new URLSearchParams(search)
    const encoded = params.get(SHARE_PARAM)
    if (!encoded || encoded.length > MAX_SHARE_BYTES) return null
    const json = decodeURIComponent(atob(encoded))
    if (!fmazeImportAdapter.canImport(json)) return null
    const doc = fmazeImportAdapter.import(json)
    return validateMaze(doc).valid ? doc : null
  } catch {
    return null
  }
}
