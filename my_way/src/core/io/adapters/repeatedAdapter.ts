import type { ImportAdapter, ExportAdapter } from '../AdapterInterface'
import type {
  RepeatedDirectedDefinition,
  DirectedPort,
  Terminal,
  RepeatedState,
} from '../../model/repeatedDirected'
import { defaultRenderConfig } from '../../model/renderConfig'
import { defaultSolverConfig } from '../../model/solverInterface'

export const repeatedImportAdapter: ImportAdapter = {
  formatName: 'Koteitan repeated directed ports',
  fileExtensions: ['.txt'],
  canImport: (raw) => typeof raw === 'string' && /normal:\s*(?:[CNESW]\d+\s*(?:->|-)|;)/i.test(raw),
  import(raw) {
    if (typeof raw !== 'string') throw new Error('Repeated mazes use port text')
    const text = raw
      .replace(/^\s*Maze:\s*/i, '')
      .split(/\bPath:/i)[0]
      .trim()
    const sections = [...text.matchAll(/(normal|nx|ny|zero):\s*([^;]*)/g)]
    const atomic = sections.some((section) => section[1] === 'zero')
    const expected = atomic ? 4 : 3
    if (sections.length !== expected || new Set(sections.map((section) => section[1])).size !== expected)
      throw new Error('Provide normal, nx, and ny once; atomic mazes also need zero')
    const ports: Record<string, DirectedPort[]> = {}
    let maxIndex = 1
    for (const section of sections) {
      ports[section[1]] =
        section[2].trim() && section[2].trim() != '(none)'
          ? section[2].split(',').flatMap((part) => {
              const match = part.trim().match(/^([CNESW])(\d+)\s*(->|-)\s*([CNESW])(\d+)$/)
              if (!match) throw new Error(`Invalid directed port: ${part}`)
              if (
                !atomic && section[1] !== 'normal' &&
                (match[1] !== (section[1] === 'nx' ? 'E' : 'N') || match[4] !== match[1])
              )
                throw new Error(`Invalid ${section[1]} boundary port: ${part}`)
              maxIndex = Math.max(maxIndex, Number(match[2]), Number(match[5]))
              const from = `${match[1]}${match[2]}` as Terminal, to = `${match[4]}${match[5]}` as Terminal
              if (!atomic && (from[0] === 'C' || to[0] === 'C'))
                throw new Error('Internal C terminals require the atomic zero section')
              return match[3] === '-' ? [{ from, to }, { from: to, to: from }] : [{ from, to }]
            })
          : []
    }
    const providedRoute = [...raw.matchAll(/\((\d+),(\d+),([CNESW]\d+)\)/g)].map(
      (match): RepeatedState => ({ x: Number(match[1]), y: Number(match[2]), terminal: match[3] as Terminal })
    )
    const now = new Date().toISOString()
    const definition: RepeatedDirectedDefinition = {
      type: 'repeatedDirected',
      terminalsPerSide: maxIndex + 1,
      normal: ports.normal,
      nx: ports.nx,
      ny: ports.ny,
      ...(atomic ? { zero: ports.zero } : {}),
      ...(providedRoute.length ? { providedRoute } : {}),
      start: { x: atomic ? 0 : 1, y: atomic ? 0 : 1, terminal: 'W0' },
      goal: { x: atomic ? 0 : 1, y: atomic ? 0 : 1, terminal: 'W1' },
    }
    return {
      formatVersion: '1.0',
      metadata: {
        id: crypto.randomUUID(),
        title: 'Repeated directed maze',
        tags: ['koteitan', 'repeated'],
        createdAt: now,
        updatedAt: now,
      },
      representationType: 'repeatedDirected',
      definition,
      renderConfig: { ...defaultRenderConfig },
      solverConfig: { ...defaultSolverConfig },
      annotations: [],
    }
  },
}
export const repeatedExportAdapter: ExportAdapter = {
  formatName: 'Repeated directed ports',
  fileExtension: '.txt',
  export(doc) {
    if (doc.representationType !== 'repeatedDirected')
      throw new Error('Requires repeated directed maze')
    const def = doc.definition as RepeatedDirectedDefinition
    const types = def.zero ? ['normal', 'nx', 'ny', 'zero'] as const : ['normal', 'nx', 'ny'] as const
    return types
      .map((type) => `${type}: ${(def[type] ?? []).map((port) => `${port.from}->${port.to}`).join(', ')}`)
      .join('; ')
  },
}
