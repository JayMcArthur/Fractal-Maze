import { extractSvgTraces } from './svgTraceImport'
import { assetUrl } from '../../core/io/assetUrl'
import type { MazeArtwork } from '../../core/model/pathMaze'

export function sourceImage(asset: string): Promise<MazeArtwork> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () =>
      resolve({
        asset,
        width: image.naturalWidth,
        height: image.naturalHeight,
        bounds: [0, 0, image.naturalWidth, image.naturalHeight],
        traces: [],
        frames: [],
      })
    image.onerror = () => reject(new Error('Could not open this artwork.'))
    image.src = assetUrl(asset)
  })
}

export async function importArtwork(file: File): Promise<MazeArtwork> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose artwork smaller than 20 MB.')
  if (!/\.(svg|png|jpe?g|webp|gif)$/i.test(file.name))
    throw new Error('Choose SVG, PNG, JPEG, WebP, or GIF artwork.')
  const asset: string = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read the artwork file.'))
    reader.readAsDataURL(file)
  })
  const artwork = await sourceImage(asset)
  if (!file.name.toLowerCase().endsWith('.svg')) return artwork
  return extractSvgTraces(await file.text(), artwork)
}
