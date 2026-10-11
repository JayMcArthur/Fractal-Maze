/**
 * Koteitan fractalblockmaze import adapter.
 * Imports the koteitan format (JS/JSON map + unit) to BlockRecursiveDefinition.
 *
 * Koteitan format:
 *   map = [[1,0,...], ...] — 2D array of 1=wall, 0=path
 *   unit = map.length      — grid side length
 *   start = [col, row]     — start position
 *   goal  = [col, row]     — goal position
 */
import type { RecursiveMazeDocument } from '../../model/RecursiveMazeDocument'
import type { BlockRecursiveDefinition } from '../../model/blockRecursive'
import type { ImportAdapter } from '../AdapterInterface'

export interface KoteitanFormat {
  map: number[][] // 2D grid of 1=wall, 0=path
  unit?: number
  start?: [number, number] | null // [col, row]
  goal?: [number, number] | null
  drawdepth?: number
}

export function importKoteitan(data: KoteitanFormat): RecursiveMazeDocument {
  const map = data.map
  const unit = data.unit ?? map.length

  if (
    !Number.isInteger(unit) ||
    unit < 2 ||
    map.length !== unit ||
    map.some((row) => row.length !== unit)
  )
    throw new Error('Block map must be a square matching its unit size')

  // Flatten the binary pattern in row-major order.
  const pattern: number[] = []
  for (let row = 0; row < unit; row++) {
    for (let col = 0; col < unit; col++) {
      pattern.push(map[row][col])
    }
  }

  // Determine start and goal — defaults: start=(0,0), goal=(unit-1, unit-1)
  const start = data.start === undefined ? ([0, 0] as [number, number]) : data.start
  const goal = data.goal === undefined ? ([unit - 1, unit - 1] as [number, number]) : data.goal

  const def: BlockRecursiveDefinition = {
    type: 'blockRecursive',
    unit,
    pattern,
    start,
    goal,
  }

  const now = new Date().toISOString()
  const doc: RecursiveMazeDocument = {
    formatVersion: '1.0',
    metadata: {
      id: crypto.randomUUID(),
      title: 'Koteitan Fractal Block Maze',
      tags: ['blockRecursive', 'koteitan'],
      createdAt: now,
      updatedAt: now,
    },
    representationType: 'blockRecursive',
    definition: def,
    renderConfig: {
      preferredRenderer: 'canvas',
      maxDepth: data.drawdepth ?? 3,
      showBreadcrumbs: false,
      showBlockLabels: false,
      animationSpeed: 'normal',
    },
    solverConfig: {
      maxDepth: 10,
      maxNodes: 100000,
      timeoutMs: 30000,
      strategy: 'bfs',
    },
    annotations: [],
  }

  return doc
}

/**
 * Try to parse a koteitan JSON/JS object string into a RecursiveMazeDocument.
 * Returns null if the format is not recognized.
 */
export function tryImportKoteitanString(text: string): RecursiveMazeDocument | null {
  try {
    // Try plain JSON
    const data = JSON.parse(text) as KoteitanFormat
    if (Array.isArray(data.map) && data.map.length > 0) {
      return importKoteitan(data)
    }
    return null
  } catch {
    return null
  }
}

function parseKoteitan(raw: string | object): KoteitanFormat | null {
  try {
    const data = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Partial<KoteitanFormat>
    if (!Array.isArray(data.map) || data.map.length === 0) return null
    if (!data.map.every((row) => Array.isArray(row))) return null
    return data as KoteitanFormat
  } catch {
    return null
  }
}

export const koteitanImportAdapter: ImportAdapter = {
  formatName: 'Koteitan fractal block JSON',
  fileExtensions: ['.json', '.fblock.json'],

  canImport(raw: string | object): boolean {
    return parseKoteitan(raw) !== null
  },

  import(raw: string | object): RecursiveMazeDocument {
    const data = parseKoteitan(raw)
    if (!data) throw new Error('Not a valid Koteitan block-maze document')
    return importKoteitan(data)
  },
}
