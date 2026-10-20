import { catalogIndex, type IndexedMaze } from './catalogIndex'
import type { CatalogEntry } from './catalog'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'

export function mazeEntry(id: string, doc: RecursiveMazeDocument | null) {
  const model = doc?.definition
  const incomplete =
    (model?.type === 'pathPushdown' || model?.type === 'infiniteRule') &&
    (!model.start || !model.goal)
  return { to: `/play/${id}`, playable: !incomplete }
}

export interface MazeView {
  id: string
  label: string
}
interface MazeFamily {
  title: string
  author: string
  views: MazeView[]
  recordings?: MazeView[]
}
const source = (reference: string, label = 'Source-derived blocks'): MazeView => ({
  id: `draft-maze-images-${reference}`,
  label,
})
const grid = (id: string): MazeView => ({ id, label: 'Block remake' })
const guide = (index: number): MazeView => ({ id: `pda-guide-${index}`, label: 'Guide PDA' })

/** A family is one puzzle with selectable source/converted views; IDs stay stable for saved work. */
export const mazeFamilies: MazeFamily[] = [
  {
    title: 'Alice and the Fractal Hedge Maze',
    author: 'Mike Earnest',
    views: [grid('alice-in-wonderland')],
    recordings: [source('mike-earnest-alice-and-the-hedge-maze-png', 'Earlier source-derived layout')],
  },
  {
    title: 'Skeptic Play 1',
    author: 'Siggy',
    views: [grid('square')],
    recordings: [
      source('siggy-skeptic-play-1-svg', 'Earlier source-derived layout'),
      source('siggy-skeptic-play-1-steps-svg', 'Earlier annotated layout'),
      guide(1),
    ],
  },
  { title: 'Sierpinski Paths', author: 'Siggy', views: [source('siggy-skeptic-play-2-jpg')] },
  { title: 'Sierpinski corridor maze', author: 'Orel Cosseron', views: [grid('sierpinski')] },
  {
    title: 'Skeptic Play 3',
    author: 'Siggy',
    views: [grid('skeptic-play-carpet')],
    recordings: [guide(5), source('siggy-skeptic-play-3-png', 'Earlier source-derived layout')],
  },
  { title: 'Wolfram 0', author: 'Mark J. P. Wolf', views: [source('mark-j-p-wolf-wolfram-0-jpg')] },
  {
    title: 'Wolfram 1',
    author: 'Mark J. P. Wolf',
    views: [source('mark-j-p-wolf-wolfram-1-gif')],
    recordings: [source('mark-j-p-wolf-wolfram-1-solution-jpg', 'Earlier annotated scan')],
  },
  {
    title: 'Wolfram 2',
    author: 'Mark J. P. Wolf',
    views: [grid('microchip')],
    recordings: [
      source('mark-j-p-wolf-wolfram-2-jpg', 'Earlier photograph-derived layout'),
      { id: 'wolf-wire-original', label: 'Original solutions' },
      source('mark-j-p-wolf-wolfram-2-wires-png', 'Earlier wire drawing'),
      source('mark-j-p-wolf-wolfram-2-nested-png', 'Earlier nested drawing'),
      { ...guide(2), label: 'Earlier guide model' },
    ],
  },
  {
    title: 'Geocaching — Easter 13-#10',
    author: 'Amurielagi',
    views: [source('geocaching-easter-13-10-png')],
  },
  { title: 'Luegaria', author: 'Luegarua', views: [source('luegarua-webp')] },
  {
    title: 'Daedalus 2 / Numb3rs',
    author: 'Ed Pegg Jr',
    views: [source('ed-pegg-jr-daedalus-2-jpg')],
  },
  {
    title: 'Inner Frame',
    author: 'Matthias Weber',
    views: [grid('matthias-weber')],
    recordings: [source('the-inner-frame-pdf', 'Earlier room layout'), { ...guide(4), label: 'Earlier guide model' }],
  },
  {
    title: 'A Long Path',
    author: 'Jay McArthur',
    views: [
      { ...grid('a-long-path-v4'), label: 'v4 block layout' },
      { ...guide(6), label: 'v6 block layout' },
      { ...grid('a-long-path-v8'), label: 'v8 block layout' },
    ],
    recordings: [source('jay-mcarthur-a-long-path-v6-png', 'Earlier v6 layout'), guide(3)],
  },
  {
    title: 'Snuke 3', author: 'Snuke', views: [source('snuke-snuke-3-png')],
    recordings: [{ id: 'ports-snuke_no3', label: 'Earlier port model' }],
  },
  {
    title: 'Snuke 4', author: 'Snuke', views: [source('snuke-snuke-4-png')],
    recordings: [{ id: 'ports-snuke_no4', label: 'Earlier port model' }],
  },
  {
    title: 'Windischer spiral',
    author: 'Martin Windischer',
    views: [source('martin-windischer-windischer-png', 'Original image')],
    recordings: [
      source('martin-windischer-windischer-gif', 'Earlier GIF reference'),
      source('martin-windischer-windischer-recursion-jpg', 'Annotated layers'),
    ],
  },
  ...['md3', 'md4', 'md5'].map((id) => ({
    title: `Minsky doubling — ${id.slice(2)} stages`,
    author: 'Koteitan',
    views: [
      { id: `repeated-atomic-${id}`, label: 'Atomic terminals' },
      { id: `repeated-${id}`, label: 'Legacy shared terminals' },
    ],
  })),
]

export const viewsForMaze = (id: string): MazeView[] =>
  mazeFamilies.find((family) => [...family.views, ...(family.recordings ?? [])].some((view) => view.id === id))?.views ?? []

/** Public links select the native layout while recordings retain their original IDs. */
export function defaultPlayId(id: string): string {
  if (id === 'draft-maze-images-jay-mcarthur-a-long-path-v6-png') return 'pda-guide-6'
  return viewsForMaze(id)[0]?.id ?? id
}

export function replayViewsForMaze(id: string): MazeView[] {
  const family = mazeFamilies.find((family) =>
    [...family.views, ...(family.recordings ?? [])].some((view) => view.id === id)
  )
  return family ? [...family.views, ...(family.recordings ?? [])] : []
}

const alternateIds = new Set(
  mazeFamilies.flatMap((family) => family.views.slice(1).map((view) => view.id))
)
// Superseded presentations remain loadable for saved documents and replay snapshots.
const retiredViews = new Set(mazeFamilies.flatMap(family => (family.recordings ?? []).map(view => view.id)))

export const mazeCatalog: IndexedMaze[] = catalogIndex
  .filter((entry) => !alternateIds.has(entry.id) && !retiredViews.has(entry.id))
  .map((entry) => ({
    ...entry,
    author: mazeFamilies.find((family) => family.views[0].id === entry.id)?.author ?? entry.author,
    tags: [
      ...new Set(
        [
          entry,
          ...catalogIndex.filter((view) =>
            viewsForMaze(entry.id).some((choice) => choice.id === view.id)
          ),
        ].flatMap((view) => view.tags)
      ),
    ],
    title: mazeFamilies.find((family) => family.views[0].id === entry.id)?.title ?? entry.title,
  }))

export function adjacentMaze(id: string, offset: -1 | 1): CatalogEntry {
  const primary = viewsForMaze(id)[0]?.id ?? id
  const index = Math.max(
    0,
    mazeCatalog.findIndex((entry) => entry.id === primary)
  )
  return mazeCatalog[(index + offset + mazeCatalog.length) % mazeCatalog.length]
}
