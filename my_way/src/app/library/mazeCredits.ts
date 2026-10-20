import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import references from '../../data/manifests/references.json'
import { assetUrl } from '../../core/io/assetUrl'
import { catalogIndex, referenceDraftId } from './catalogIndex'
import { replayViewsForMaze } from './mazeViews'

/** Credits follow the puzzle family even when Play uses a native block remake. */
export function mazeCredits(doc: RecursiveMazeDocument) {
  const family = replayViewsForMaze(doc.metadata.id)
  const ids = family.length ? family.map((view) => view.id) : [doc.metadata.id]
  const originals = references.filter(
    (reference) =>
      ids.includes(referenceDraftId(reference.id) ?? '') || ids.includes(reference.playableId ?? '')
  )
  const links = new Map<string, string>()
  const addSource = (value: string | undefined | null) => {
    if (value && /^https?:\/\//i.test(value)) links.set(value, 'Original source')
  }
  const entry = catalogIndex.find((entry) => entry.id === doc.metadata.id)
  addSource(doc.metadata.source ?? entry?.source)
  if (ids.includes('draft-maze-images-martin-windischer-windischer-png'))
    addSource('https://www.mathpuzzle.com/17Dec06.html')
  const source = doc.metadata.source ?? ''
  const programs: [string, string][] = [
    ['koteitan_repeated-maze-main/', 'koteitan/repeated-maze'],
    ['upstream_sources/koteitan-repeated-maze/', 'koteitan/repeated-maze'],
    ['koteitan_fractal-maze-solver-main/', 'koteitan/fractal-maze-solver'],
    ['koteitan_fractalblockmaze-main/', 'koteitan/fractalblockmaze'],
    ['Webpage/fractal-maze-master', 'sparecycles/fractal-maze'],
  ]
  for (const [prefix, repository] of programs)
    if (source.startsWith(prefix))
      links.set(`https://github.com/${repository}`, 'Original program & source')
  if (entry?.file.endsWith('.maze'))
    links.set('https://github.com/orelcosseron/fractal-maze', 'Block remake · Orel Cosseron')
  if (entry?.representationType === 'geometricRecursive')
    links.set('https://github.com/amurielagi/fractal-maze', 'Original player & source')
  if (entry?.id === 'repeated-directed-example')
    links.set('https://github.com/koteitan/repeated-maze', 'Original program & source')
  for (const reference of originals) {
    addSource(reference.source)
    links.set(assetUrl(reference.asset), `Original artwork · ${reference.title}`)
  }
  if (doc.artwork?.asset && !originals.some((reference) => reference.asset === doc.artwork!.asset))
    links.set(assetUrl(doc.artwork.asset), 'Original artwork')
  const author = [
    ...new Set(
      [...originals.map((reference) => reference.author), doc.metadata.author].filter(
        (name) => name && name !== 'Source conversion'
      )
    ),
  ].join(' · ')
  return {
    author,
    license: doc.metadata.license,
    links: [...links].map(([href, label]) => ({ href, label })),
  }
}
