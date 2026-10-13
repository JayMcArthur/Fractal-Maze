import { expect, it } from 'vitest'
import type { MazeArtwork } from '../core/model/pathMaze'
import { sourceGateDirection, walkSource } from '../core/play/sourceWalking'
import { loadCatalogMaze } from '../app/library/catalog'
import { createBlockArtwork } from '../core/play/blockArtwork'
import type { PathMazeDefinition } from '../core/model/pathMaze'

const artwork = (traces: MazeArtwork['traces'], gates?: MazeArtwork['gates']): MazeArtwork => ({
  asset: 'test.svg',
  width: 100,
  height: 100,
  bounds: [0, 0, 100, 100],
  frames: [],
  traces,
  gates,
})
const trace = (id: string, points: [number, number][], directed = false) => ({
  id,
  path: '1',
  color: '#000',
  points,
  directed,
})

it('follows forced bends and stops at a T junction so the next key chooses a branch', () => {
  const art = artwork([
    trace('main', [
      [0, 0],
      [10, 0],
      [10, 10],
      [10, 20],
    ]),
    trace('branch', [
      [10, 10],
      [20, 10],
    ]),
  ])
  expect(walkSource(art, '1', [0, 0], 4)).toEqual([
    [0, 0],
    [10, 0],
    [10, 10],
  ])
  expect(walkSource(art, '1', [10, 10], 4)?.at(-1)).toEqual([20, 10])
  expect(walkSource(art, '1', [10, 10], 2)?.at(-1)).toEqual([10, 20])
})
it('does not turn onto a crossing wire that has no junction', () => {
  const art = artwork([
    trace('horizontal', [
      [0, 10],
      [20, 10],
    ]),
    trace('vertical', [
      [10, 0],
      [10, 20],
    ]),
  ])
  expect(walkSource(art, '1', [0, 10], 4)?.at(-1)).toEqual([20, 10])
  expect(walkSource(art, '1', [10, 10], 2)).toBeNull()
})
it('stops at a gate inside a stroke and respects a one-way trace', () => {
  const art = artwork(
    [
      trace(
        'arrow',
        [
          [0, 0],
          [20, 0],
        ],
        true
      ),
    ],
    [{ edge: 'A-enter', from: [10, 0], to: [0, 0] }]
  )
  expect(walkSource(art, '1', [0, 0], 4, [[10, 0]])?.at(-1)).toEqual([10, 0])
  expect(walkSource(art, '1', [10, 0], 1)).toBeNull()
  expect(walkSource(art, '1', [10, 0], 4)?.at(-1)).toEqual([20, 0])
})
it('does not merge neighboring samples into spurious intersections', () => {
  const art = artwork([
    trace('dense', [
      [0, 0],
      [0.1, 0],
      [0.2, 0],
      [0.3, 0],
      [1, 0],
    ]),
  ])
  expect(walkSource(art, '1', [0, 0], 4)?.at(-1)).toEqual([1, 0])
})

it('waits for a clear choice when two branches point in the same keyboard direction', () => {
  const art = artwork([
    trace('left', [
      [10, 10],
      [0, 0],
    ]),
    trace('right', [
      [10, 10],
      [20, 0],
    ]),
  ])
  expect(walkSource(art, '1', [10, 10], 8)).toBeNull()
  expect(walkSource(art, '1', [10, 10], 1)?.at(-1)).toEqual([0, 0])
  expect(walkSource(art, '1', [10, 10], 4)?.at(-1)).toEqual([20, 0])
})

it('passes a bend that is only the arrival point of another path', () => {
  const art = artwork(
    [
      trace('bend', [
        [0, 0],
        [10, 0],
        [10, 20],
      ]),
    ],
    [{ edge: 'other-path', from: [80, 80], to: [10, 0] }]
  )
  expect(walkSource(art, '1', [0, 0], 4)?.at(-1)).toEqual([10, 20])
})

it('continues through Inner Frame room doors using the drawn approach in both displays', () => {
  const doc = loadCatalogMaze('draft-maze-images-the-inner-frame-pdf')!
  const model = doc.definition as PathMazeDefinition
  const source = doc.artwork!, blocks = createBlockArtwork(source, model)
  const entries = model.connections.filter(edge => edge.operation === 'enter')
  expect(entries.map(edge => sourceGateDirection(source, edge, model))).toEqual([4, 1, 1, 4, 1, 1, 4, 4])
  expect(entries.map(edge => sourceGateDirection(blocks, edge, model))).toEqual([4, 2, 1, 2, 1, 2, 4, 2])
})
