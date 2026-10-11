import fixtures from '../../data/mazes/path-fixtures.json'
import imageRegistry from '../../data/mazes/artwork-registry.json'
import infinite from '../../data/mazes/infinite-fixtures.json'
import playable from '../../data/mazes/playable-artwork.json'
import raster from '../../data/mazes/raster-circuits.json'
import snuke from '../../data/mazes/snuke-artwork.json'
import wolfTomb from '../../data/mazes/wolf-tomb.json'
import luegaria from '../../data/mazes/luegaria-artwork.json'
import carpet from '../../data/mazes/carpet-artwork.json'
import sierpinskiPaths from '../../data/mazes/sierpinski-paths.json'
import wolfTwo from '../../data/mazes/wolf-two-artwork.json'
import wolfOne from '../../data/mazes/wolf-one-artwork.json'
import snukeTwo from '../../data/mazes/snuke-two-artwork.json'
import snukeOne from '../../data/mazes/snuke-one-artwork.json'
import daedalusWires from '../../data/mazes/daedalus-wires.json'
import daedalusPhoto from '../../data/mazes/daedalus-photo.json'
import aliceHedge from '../../data/mazes/alice-hedge.json'
import innerFrameRooms from '../../data/mazes/inner-frame-rooms.json'
import jayHexagon from '../../data/mazes/jay-hexagon.json'
import berkly from '../../data/mazes/berkly-artwork.json'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { MazeArtwork, MazePath, PathMazeDefinition } from '../../core/model/pathMaze'
import { artworkSchema, pathMazeSchema } from '../../core/pathMaze/validation'
import { connectionsFromPairs } from '../../core/pathMaze/traversal'
import { defaultRenderConfig } from '../../core/model/renderConfig'
import { defaultSolverConfig } from '../../core/model/solverInterface'

const date = '2026-10-09T00:00:00Z'
export const fixtureReferences: Record<number, string> = {
  1: 'maze-images-siggy-skeptic-play-1-jpg',
  2: 'maze-images-mark-j-p-wolf-wolfram-2-wires-png',
  4: 'maze-images-the-inner-frame-pdf',
  5: 'maze-images-siggy-skeptic-play-3-alt-png',
  6: 'maze-images-jay-mcarthur-a-long-path-v6-png',
}
const names: Record<number, string> = {
  1: 'Skeptic Play 1',
  2: 'Wolfram 2 — guide conversion',
  3: 'Jay McArthur — eight-copy PDA',
  4: 'Inner Frame — guide PDA',
  5: 'Skeptic Play 3 — revised drawing',
  6: 'Jay McArthur — A Long Path v6',
}
const colors = ['#29994e', '#d84444', '#9454c4', '#347ec2', '#b549ba', '#d79b18']
const sourceRows = [
  ...snuke,
  ...wolfTomb,
  ...luegaria,
  ...carpet,
  ...sierpinskiPaths,
  ...wolfTwo,
  ...wolfOne,
  ...snukeTwo,
  ...snukeOne,
  ...daedalusWires,
  ...daedalusPhoto,
  ...aliceHedge,
  ...innerFrameRooms,
  ...jayHexagon,
  ...berkly,
]
export function pathDocument(
  id: string,
  title: string,
  definition: PathMazeDefinition,
  artwork?: MazeArtwork
): RecursiveMazeDocument {
  return {
    formatVersion: '1.0',
    representationType: definition.type,
    metadata: {
      id,
      title,
      author: 'Source conversion',
      tags: [
        'paths',
        'pda',
        'wip',
        ...(definition.type === 'infiniteRule' ? ['infinite', 'proof'] : []),
      ],
      createdAt: date,
      updatedAt: date,
    },
    definition,
    artwork,
    annotations: [],
    renderConfig: { ...defaultRenderConfig },
    solverConfig: { ...defaultSolverConfig },
  }
}
export const emptyPathModel = (): PathMazeDefinition => ({
  type: 'pathPushdown',
  paths: [],
  copies: [],
  connections: [],
  start: null,
  goal: null,
  allowedRule: 'finite',
  claims: [],
  review: 'wip',
  notes: [],
})
const fixtureDocs = fixtures.map((fixture) => {
  const bound = raster.find((row) => row.fixture === fixture.fixture)
  if (bound)
    return pathDocument(
      `pda-guide-${fixture.fixture}`,
      names[fixture.fixture],
      pathMazeSchema.parse(bound.definition),
      artworkSchema.parse(bound.artwork)
    )
  const helper = fixture.fixture === 4 ? '5' : fixture.fixture === 2 ? 'C' : null
  const paths: MazePath[] = fixture.paths.map((id, i) => ({
    id,
    label: String(id.charCodeAt(0) - 48),
    color: colors[i % colors.length],
    helper: id === helper,
  }))
  const notes = [
    'Connectivity follows Jay’s path-labeling guide and Python fixture. Match the trace labels to the artwork before marking reviewed.',
  ]
  if (fixture.fixture === 2)
    notes.push(
      'WIP: the source omits 3–7 A/ and introduces helper path 19. Confirm this disputed connection against the drawing.',
      'The source example ends on path 17 inside A→B. Python acceptance_mode=both accepts a final state OR an empty stack; this is not a surface-finish solution. The player checks the required address explicitly.'
    )
  if (fixture.fixture === 4)
    notes.push(
      'Helper path 5 and 5) disambiguate the source PDA. They are bookkeeping, not a fifth room in the image.'
    )
  if (fixture.fixture === 6)
    notes.push(
      'Six-copy v6 uses copies A–F and seven paths, parameterized from Jay’s recurrence. Verify the corridor labels and gate layout against the raster; this is not the eight-copy fixture.'
    )
  if (fixture.fixture === 3)
    notes.push('This fixture has eight copies A–H. The six-copy v6 artwork has a separate draft.')
  const reference = imageRegistry.find(
    (row) => row.reference === fixtureReferences[fixture.fixture]
  )
  const doc = pathDocument(
    `pda-guide-${fixture.fixture}`,
    names[fixture.fixture],
    {
      ...emptyPathModel(),
      paths,
      copies: fixture.copies,
      connections: connectionsFromPairs(
        fixture.pairs,
        'Papers/Fractal_Maze_to_PDA/Fractal_Maze_PDA.py'
      ),
      start: { path: fixture.start, address: [] },
      goal: { path: fixture.goal, address: [] },
      providedInput: fixture.providedInput,
      notes,
    },
    reference ? artworkSchema.parse(reference.artwork) : undefined
  )
  const sourceArtwork = playable.find((row) => row.reference === fixtureReferences[fixture.fixture])
  if (sourceArtwork) doc.artwork = artworkSchema.parse(sourceArtwork.artwork)
  doc.metadata.source = 'Papers/Fractal_Maze_to_PDA/Fractal_Maze_to_PDA.md'
  return doc
})
const boundReferences = new Set([
  ...Object.values(fixtureReferences),
  ...[...playable, ...raster, ...sourceRows, ...infinite].map((row) => row.reference),
])
const imageDocs = imageRegistry
  .filter((row) => !boundReferences.has(row.reference))
  .map((row) => {
    const spiral = row.reference.startsWith('maze-images-martin-windischer-')
    const doc = pathDocument(
      `draft-${row.reference}`,
      row.title,
      {
        ...emptyPathModel(),
        type: spiral ? 'infiniteRule' : 'pathPushdown',
        paths: row.paths,
        copies: spiral ? ['A'] : row.artwork.frames.map((frame) => frame.id),
        connections: spiral ? [] : connectionsFromPairs(
          row.pairs,
          'Tentative boundary matching from artwork; review every gate.'
        ),
        notes: [
          'WIP image conversion. Trace candidates follow the original pixels. Review connected paths, crossings, copy frames, and gate mappings; then choose the start and finish.',
          ...(spiral ? [
            'The author confirms infinite recursion toward one central limit point. PNG, GIF and the annotated layer image show the same puzzle.',
            'Layer-boundary annotations do not yet determine a complete gate table. The earlier guessed gate pairs are removed. Confirm the travel surface and homologous terminals before adding enter/exit connections.',
            'Infinite recursion does not automatically permit jumping through the center. Finite movement is selected until an extra limit rule is explicitly chosen and supported by witness routes.',
          ] : []),
          ...row.notes,
        ],
      },
      artworkSchema.parse(row.artwork)
    )
    doc.metadata.author = row.author
    doc.metadata.source = row.artwork.asset.replace('references/', '')
    return doc
  })
const infiniteDocs = infinite.map((fixture) => {
  const doc = pathDocument(
    `proof-${fixture.reference}`,
    fixture.title,
    {
      ...emptyPathModel(),
      type: 'infiniteRule',
      paths: fixture.paths,
      copies: fixture.copies,
      connections: connectionsFromPairs(
        fixture.pairs,
        'SVG wire endpoints and matching copy gates'
      ),
      start: { path: fixture.start, address: [] },
      goal: { path: fixture.goal, address: [] },
      allowedRule: fixture.allowedRule as PathMazeDefinition['allowedRule'],
      notes: [
        'WIP: review the gate-to-path conversion against the original SVG. Proofs check this topology and the selected movement rules.',
        ...(fixture.title === 'First Cantor'
          ? [
              'Surface gate 6 is the default start, with a checked joint Cantor solution in Replays. The original allows any outer gate. Blue connected path 12 contains F.',
            ]
          : []),
      ],
    },
    artworkSchema.parse(fixture.artwork)
  )
  doc.metadata.author = 'Siggy'
  doc.metadata.source =
    'https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/'
  doc.metadata.license = 'Artwork: CC BY-NC 4.0, Siggy'
  return doc
})
const playableDocs = playable
  .filter((row) => !Object.values(fixtureReferences).includes(row.reference))
  .map((row) => {
    const source = fixtureDocs.find((doc) => doc.metadata.id === `pda-guide-${row.fixture}`)!
    const doc = structuredClone(source)
    doc.metadata.id = `draft-${row.reference}`
    doc.metadata.title = row.reference.endsWith('steps-svg')
      ? 'Skeptic Play 1 — annotated routes'
      : 'Skeptic Play 1 — source SVG'
    doc.artwork = artworkSchema.parse(row.artwork)
    const def = doc.definition as PathMazeDefinition
    def.paths = def.paths.map((path) => ({
      ...path,
      color: doc.artwork!.traces.find((trace) => trace.path === path.id)!.color,
    }))
    def.notes = [
      'Source curves, copy gates, and start/finish are bound to the guide PDA. WIP: check the conversion against the original artwork.',
    ]
    return doc
  })
const rasterDocs = raster
  .filter((row) => !row.fixture)
  .map((row) =>
    pathDocument(
      `draft-${row.reference}`,
      row.title,
      pathMazeSchema.parse(row.definition),
      artworkSchema.parse(row.artwork)
    )
  )
const sourceDocs = sourceRows.map((row) => {
  const doc = pathDocument(
    `draft-${row.reference}`,
    row.title,
    pathMazeSchema.parse(row.definition),
    artworkSchema.parse(row.artwork)
  )
  const source = imageRegistry.find((entry) => entry.reference === row.reference)
  doc.metadata.author = source?.author
  doc.metadata.source = source?.artwork.asset.replace('references/', '')
  return doc
})
export const pathDocs = [
  ...fixtureDocs,
  ...imageDocs,
  ...infiniteDocs,
  ...playableDocs,
  ...rasterDocs,
  ...sourceDocs,
]
export async function hydrateArtwork(doc: RecursiveMazeDocument): Promise<RecursiveMazeDocument> {
  if (!doc.artwork || doc.artwork.traces.length) return doc
  const { default: drafts } = await import('../../data/mazes/artwork-drafts.json')
  const row = drafts.find((draft) => draft.artwork.asset === doc.artwork!.asset)
  if (!row) return doc
  const artwork = artworkSchema.parse(structuredClone(row.artwork))
  if (doc.metadata.id.startsWith('pda-guide-'))
    artwork.traces = artwork.traces.map((trace) => ({ ...trace, path: '' }))
  return { ...doc, artwork }
}
