import type { MazeArtwork } from '../../core/model/pathMaze'

/** Extract geometry in an inert XML document; source markup is never inserted into the page. */
export function extractSvgTraces(text: string, artwork: MazeArtwork): MazeArtwork {
  const xml = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = xml.querySelector('svg')
  if (!svg || xml.querySelector('parsererror')) throw new Error('This SVG could not be parsed.')
  const viewBox = svg.viewBox.baseVal
  if (viewBox.width > 0 && viewBox.height > 0) {
    artwork.width = viewBox.width
    artwork.height = viewBox.height
    // Image coordinates begin at zero even when the SVG viewBox does not.
    artwork.bounds = [0, 0, viewBox.width, viewBox.height]
  }
  for (const path of svg.querySelectorAll('path')) {
    const presentation = pathPresentation(path, svg)
    if (
      !presentation ||
      !presentation.color ||
      presentation.color === 'none' ||
      presentation.fill !== 'none'
    )
      continue
    const { color, matrix } = presentation
    const length = path.getTotalLength()
    if (!length) continue
    const count = Math.max(
      2,
      Math.ceil((length * Math.hypot(matrix.a, matrix.b)) / (artwork.width / 1000))
    )
    if (count > 20000 || artwork.traces.length >= 2000)
      throw new Error('This SVG is too detailed to trace. Simplify it before importing.')
    const points: [number, number][] = Array.from({ length: count + 1 }, (_, index) => {
      const fraction = index / count
      const source = path.getPointAtLength(length * fraction)
      const point = new DOMPoint(source.x, source.y).matrixTransform(matrix)
      return [point.x, point.y]
    })
    artwork.traces.push({
      id: crypto.randomUUID(),
      path: '',
      color,
      points,
      svg: {
        d: path.getAttribute('d')!,
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
      },
    })
  }
  return artwork
}

function pathPresentation(path: SVGPathElement, root: SVGSVGElement) {
  const ancestry: SVGGraphicsElement[] = []
  let node: Element | null = path
  let color = '',
    fill = ''
  while (node) {
    if (node instanceof SVGGraphicsElement) {
      if (
        node.style.display === 'none' ||
        node.style.visibility === 'hidden' ||
        node.getAttribute('display') === 'none' ||
        node.getAttribute('visibility') === 'hidden'
      )
        return null
      ancestry.unshift(node)
      color ||= node.style.stroke || node.getAttribute('stroke') || ''
      fill ||= node.style.fill || node.getAttribute('fill') || ''
    }
    if (node === root) break
    node = node.parentElement
  }
  let matrix = new DOMMatrix().translate(-root.viewBox.baseVal.x, -root.viewBox.baseVal.y)
  for (const element of ancestry) {
    const transform = element.transform.baseVal.consolidate()
    if (transform) matrix = matrix.multiply(transform.matrix)
  }
  return { matrix, color, fill: fill || 'black' }
}
