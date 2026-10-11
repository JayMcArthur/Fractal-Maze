import blockRoute from '../../data/mazes/omeometo-route.json'
import type { BlockRecursiveDefinition } from '../../core/model/blockRecursive'
import backlot from '../../data/mazes/backlot.json'
import { artworkSchema } from '../../core/pathMaze/validation'
import { tourSchema } from '../../core/recursiveTour/validation'
import geometricData from '../../data/mazes/geometric-collection.json'
import { importGeometricCollection } from '../../core/io/adapters/amurielagiAdapter'
import { importKoteitan } from '../../core/io/adapters/koteitanAdapter'
import { repeatedImportAdapter } from '../../core/io/adapters/repeatedAdapter'
import repeatedExample from '../../data/mazes/repeated-example.txt?raw'
import upstreamRepeated from '../../data/mazes/upstream-repeated.json'
import type { RepeatedDirectedDefinition } from '../../core/model/repeatedDirected'
import { defaultRenderConfig } from '../../core/model/renderConfig'
import { defaultSolverConfig } from '../../core/model/solverInterface'
import portFixtures from '../../data/mazes/recursive-ports.json'
import catalogData from '../../data/manifests/catalog.json'
import { orelMazeImportAdapter } from '../../core/io/adapters/orelMazeAdapter'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import { pathDocs } from './pathCatalog'
import { proofExamples } from './proofExamples'

const MAZE_SOURCES: Record<string, string> = import.meta.glob('../../data/mazes/*.maze', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export type CatalogEntry = (typeof catalogData)[number]

const REPEATED_SOURCES = import.meta.glob('../../data/mazes/repeated/*.txt', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

// These two original puzzles have no source drawing or corridor remake in this collection.
const nativeDocs = importGeometricCollection(geometricData.filter((_, index) => index === 0 || index === 9))
const block = importKoteitan({
  map: [
    [1, 0, 1, 1],
    [0, 1, 0, 1],
    [1, 0, 1, 1],
    [1, 1, 0, 0],
  ],
  start: [2, 3],
  goal: [1, 0],
  drawdepth: 3,
})
block.metadata.id = 'koteitan-block'
block.metadata.title = 'Omeometo — fractal block maze'
block.metadata.author = 'Omeometo / Koteitan player'
block.metadata.source = 'https://omeometo.hatenablog.com/entry/2018/12/28/155549'
block.renderConfig.maxDepth = 1
;(block.definition as BlockRecursiveDefinition).providedRoute = blockRoute
const repeated = repeatedImportAdapter.import(repeatedExample)
repeated.metadata.id = 'repeated-directed-example'
repeated.metadata.title = 'Repeated directed maze — 13-step example'
repeated.metadata.author = 'Koteitan'
const graph: RecursiveMazeDocument = {
  formatVersion: '1.0',
  representationType: 'graphLabeled',
  metadata: {
    id: 'portal-connections',
    title: 'Portal connections',
    tags: ['graph', 'example'],
    createdAt: '2026-10-09T00:00:00Z',
    updatedAt: '2026-10-09T00:00:00Z',
  },
  definition: {
    type: 'graphLabeled',
    entryPortal: 'start',
    exitPortal: 'finish',
    root: {
      id: 'surface',
      label: 'Surface',
      children: [
        {
          id: 'inner',
          label: 'Inner',
          children: [],
          portals: [
            { id: 'inner-in', label: 'Inner entry', isOneWay: true, connectsTo: ['inner-out'] },
            { id: 'inner-out', label: 'Inner exit', isOneWay: false, connectsTo: ['finish'] },
          ],
        },
      ],
      portals: [
        { id: 'start', label: 'Start', isOneWay: true, connectsTo: ['inner-in'] },
        { id: 'finish', label: 'Finish', isOneWay: false, connectsTo: [] },
      ],
    },
  },
  renderConfig: { ...defaultRenderConfig },
  solverConfig: { ...defaultSolverConfig },
  annotations: [],
}
const extraBlocks = [
  {
    id: 'koteitan-block-3',
    title: 'Koteitan block pattern — 3×3',
    start: [1, 2] as [number, number],
    goal: [2, 0] as [number, number],
    map: [
      [1, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ],
  },
  {
    id: 'koteitan-block-5',
    title: 'Koteitan block pattern — 5×5',
    start: [4, 4] as [number, number],
    goal: [3, 0] as [number, number],
    map: [
      [1, 1, 1, 0, 1],
      [0, 0, 1, 1, 0],
      [1, 1, 0, 0, 1],
      [0, 0, 1, 1, 1],
      [1, 1, 1, 1, 0],
    ],
  },
].map((pattern) => {
  // The source permits any bottom entry and top exit; choose open base cells for Play.
  const doc = importKoteitan({ map: pattern.map, start: pattern.start, goal: pattern.goal, drawdepth: 1 })
  doc.metadata = {
    ...doc.metadata,
    id: pattern.id,
    title: pattern.title,
    author: 'Koteitan',
    source: 'koteitan_fractalblockmaze-main/main.js',
  }
  return doc
})
const extraRepeated = Object.entries(REPEATED_SOURCES).map(([file, raw]) => {
  const doc = repeatedImportAdapter.import(raw)
  const name = file.split('/').at(-1)!.replace('.txt', '')
  doc.metadata = {
    ...doc.metadata,
    id: `repeated-${name}`,
    title:
      name === 'cp6' ? 'Counter pump — 6 terminals' : `Minsky doubling — ${name.slice(2)} stages`,
    author: 'Koteitan',
    source: `koteitan_repeated-maze-main/maze/${name === 'cp6' ? 'counter-pump' : 'minsky-doubling'}/${name}.txt`,
  }
  return doc
})
const atomicRepeated = upstreamRepeated.map((row) => {
  const doc = repeatedImportAdapter.import(row.raw)
  const model = doc.definition as RepeatedDirectedDefinition
  if (row.id === 'cp-n3-godel') {
    doc.metadata.tags.push('wip', 'research')
  }
  if (row.route.length)
    model.providedRoute = row.route as RepeatedDirectedDefinition['providedRoute']
  doc.metadata = {
    ...doc.metadata,
    id: `repeated-atomic-${row.id}`,
    title:
      row.id === 'cp-n3-godel'
        ? 'Three-register counter pump — compiled (WIP)'
        : row.id.startsWith('md')
          ? `Minsky doubling — ${row.id.slice(2)} stages (atomic)`
          : row.id === 'penta'
            ? 'Pentation maze'
            : `Counter pump — ${row.id} (atomic)`,
    author: 'Koteitan',
    source: row.source,
  }
  return doc
})
const koteitanFixture = portFixtures.find((fixture) => fixture.id === 'ports-koteitan')!
let knownState = { blocks: [0], port: 0 }
const knownKoteitanRoute = [knownState]
for (const rule of koteitanFixture.rules.slice(1, 20)) {
  const [, , change, block, port] = rule
  knownState = {
    blocks:
      change === 1
        ? [...knownState.blocks, block]
        : change === -1
          ? knownState.blocks.slice(0, -1)
          : knownState.blocks,
    port,
  }
  knownKoteitanRoute.push(knownState)
}
const portDocs: RecursiveMazeDocument[] = portFixtures.map((fixture) => ({
  formatVersion: '1.0',
  representationType: 'recursivePorts',
  metadata: {
    id: fixture.id,
    title: fixture.title,
    author: fixture.id.includes('snuke') ? 'Snuke / Koteitan solver' : 'Koteitan',
    source: fixture.source,
    tags: ['recursive', 'ports', 'koteitan'],
    createdAt: '2026-10-09T00:00:00Z',
    updatedAt: '2026-10-09T00:00:00Z',
  },
  definition: {
    type: 'recursivePorts',
    providedRoute: fixture.id === 'ports-koteitan' ? knownKoteitanRoute : undefined,
    blocks: fixture.blocks,
    rules: fixture.rules,
    start: { blocks: [0], port: 0 },
    goal: { blocks: [0], port: fixture.goalPort },
    stayKeepsBlock: fixture.stayKeepsBlock,
  },
  renderConfig: { ...defaultRenderConfig },
  solverConfig: { ...defaultSolverConfig },
  annotations: [],
}))
const wolf: RecursiveMazeDocument = {
  formatVersion: '1.0',
  representationType: 'legacyWire',
  metadata: {
    id: 'wolf-wire-original',
    title: 'Mark J. P. Wolf — original wire maze',
    author: 'Mark J. P. Wolf / sparecycles player',
    source: 'Webpage/fractal-maze-master',
    tags: ['wire', 'recursive', 'wolf'],
    createdAt: '2026-10-09T00:00:00Z',
    updatedAt: '2026-10-09T00:00:00Z',
  },
  definition: { type: 'legacyWire', asset: 'programs/wolf/index.html' },
  renderConfig: { ...defaultRenderConfig },
  solverConfig: { ...defaultSolverConfig },
  annotations: [],
}
const backlotDoc: RecursiveMazeDocument = {
  formatVersion: '1.0',
  representationType: 'recursiveTour',
  metadata: {
    id: 'backlot',
    title: 'Backlot',
    author: 'Chris Yao',
    source: 'https://puzzles.mit.edu/2020/puzzle/backlot/',
    tags: ['recursive', 'logic', 'wip'],
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
  },
  definition: tourSchema.parse(backlot.definition),
  artwork: artworkSchema.parse(backlot.artwork),
  renderConfig: { ...defaultRenderConfig },
  solverConfig: { ...defaultSolverConfig },
  annotations: [],
}
nativeDocs.push(
  backlotDoc,
  wolf,
  ...portDocs,
  block,
  repeated,
  graph,
  ...extraBlocks,
  ...extraRepeated,
  ...atomicRepeated,
  ...pathDocs,
  ...proofExamples()
)

export const catalog: CatalogEntry[] = [
  ...catalogData,
  ...nativeDocs.map((doc) => ({
    id: doc.metadata.id,
    title: doc.metadata.title,
    author: doc.metadata.author ?? '',
    source: doc.metadata.source ?? null,
    file: '',
    representationType: doc.representationType,
    tags: doc.metadata.tags,
  })),
]

export function findCatalogEntry(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id)
}

export function loadCatalogMaze(id: string): RecursiveMazeDocument | null {
  const entry = findCatalogEntry(id)
  if (!entry) return null

  const native = nativeDocs.find((doc) => doc.metadata.id === id)
  if (native) return structuredClone(native)

  const sourceKey = Object.keys(MAZE_SOURCES).find((key) => key.endsWith(entry.file))
  const rawText = sourceKey ? MAZE_SOURCES[sourceKey] : null
  if (!rawText) return null

  const doc = orelMazeImportAdapter.import(rawText)
  doc.metadata.id = entry.id
  doc.metadata.title = entry.title
  doc.metadata.author = entry.author ?? undefined
  doc.metadata.tags = [...entry.tags]
  return doc
}
