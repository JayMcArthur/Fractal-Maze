import { catalogIndex, type IndexedMaze } from './catalogIndex'
import type { CatalogEntry } from './catalog'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'

export function mazeEntry(id: string, doc: RecursiveMazeDocument | null) {
  const model = doc?.definition
  const incomplete =
    (model?.type === 'pathPushdown' || model?.type === 'infiniteRule') &&
    (!model.start || !model.goal)
  return { to: `/${incomplete ? 'workbench' : 'play'}/${id}`, playable: !incomplete }
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
const source = (reference: string, label = 'Source drawing'): MazeView => ({
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
    views: [source('mike-earnest-alice-and-the-hedge-maze-png'), grid('alice-in-wonderland')],
  },
  {
    title: 'Skeptic Play 1',
    author: 'Siggy',
    views: [
      source('siggy-skeptic-play-1-svg', 'Original SVG'),
      source('siggy-skeptic-play-1-steps-svg', 'Annotated SVG'),
      { ...guide(1), label: 'Photograph / guide PDA' },
      grid('square'),
    ],
  },
  { title: 'Sierpinski Paths', author: 'Siggy', views: [source('siggy-skeptic-play-2-jpg')] },
  { title: 'Sierpinski corridor maze', author: 'Orel Cosseron', views: [grid('sierpinski')] },
  {
    title: 'Skeptic Play 3',
    author: 'Siggy',
    views: [
      { ...guide(5), label: 'Revised drawing / guide PDA' },
      source('siggy-skeptic-play-3-png', 'Original carpet'),
      grid('skeptic-play-carpet'),
    ],
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
    views: [source('mark-j-p-wolf-wolfram-2-jpg', 'Photograph'), grid('microchip')],
    recordings: [
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
    views: [
      source('the-inner-frame-pdf', 'Source room diagrams'),
      grid('matthias-weber'),
      guide(4),
    ],
  },
  {
    title: 'A Long Path',
    author: 'Jay McArthur',
    views: [
      { ...grid('a-long-path-v4'), label: 'v4 block layout' },
      source('jay-mcarthur-a-long-path-v6-png', 'v6 hexagon (WIP)'),
      { ...grid('a-long-path-v8'), label: 'v8 block layout' },
      { ...guide(6), label: 'Six-copy PDA' },
      { ...guide(3), label: 'Eight-copy PDA' },
    ],
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
    views: [
      source('martin-windischer-windischer-png'),
      source('martin-windischer-windischer-gif', 'GIF drawing'),
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
  mazeFamilies.find((family) => family.views.some((view) => view.id === id))?.views ?? []

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
const retiredViews = new Set([
  'ports-snuke_no3',
  'ports-snuke_no4',
  'wolf-wire-original',
  'pda-guide-2',
  'draft-maze-images-mark-j-p-wolf-wolfram-1-solution-jpg',
  'draft-maze-images-mark-j-p-wolf-wolfram-2-wires-png',
  'draft-maze-images-mark-j-p-wolf-wolfram-2-nested-png',
])
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
