import { expect, it } from 'vitest'
import { emptyPathModel, pathDocument } from '../app/library/pathDocument'
import { copyZoom } from '../core/play/copyZoom'
import { selectProofStart } from '../ui/workbench/selectProofStart'
import type { MazeArtwork, ProofClaim } from '../core/model/pathMaze'
import { fmazeExportAdapter, fmazeImportAdapter } from '../core/io/adapters/fmazeAdapter'

const model = { ...emptyPathModel(), copies: ['A'], surfaceSymbols: ['root'] }
const artwork: MazeArtwork = {
  asset: '',
  width: 100,
  height: 100,
  bounds: [0, 0, 100, 100],
  blockSize: 1,
  traces: [],
  frames: [{ id: 'A', x: 20, y: 30, width: 20, height: 20 }],
}
const parent = { state: { path: '1', address: ['root'] }, point: [20, 40] as [number, number] }
const child = { state: { path: '1', address: ['root', 'A'] }, point: [0, 50] as [number, number] }
const claim: ProofClaim = {
  id: 'route',
  rule: 'infiniteHop',
  from: parent.state,
  to: { path: '2', address: ['root'] },
  scope: [],
  period: ['A'],
  first: [{ kind: 'edge', reference: 'left', reverse: false }],
  second: [{ kind: 'edge', reference: 'right', reverse: false }],
  setup: { first: [], second: [] },
}

it('maps a child camera into its actual frame in both directions without counting surface symbols', () => {
  const enter = copyZoom(artwork, model, parent, child, false)!
  const exit = copyZoom(artwork, model, child, parent, false)!
  expect(enter.from).toEqual([0, 0, 100, 100])
  expect(enter.to).toEqual([20, 30, 20, 20])
  expect(exit.from).toEqual(enter.to)
  expect(exit.to).toEqual(enter.from)
  expect(enter.markerTo).toEqual([20, 40])
  expect(exit.marker.point).toEqual([20, 40])
  const local = copyZoom(artwork, model, parent, child, true)!
  expect(local.from.slice(2)).toEqual([32, 32])
  expect(local.to.slice(2)).toEqual([6.4, 6.4])
})

it('never invents a camera crossing for a proof jump, substitution, missing frame or same room', () => {
  expect(copyZoom(artwork, model, parent, parent, false)).toBeNull()
  expect(
    copyZoom(
      artwork,
      model,
      child,
      { ...child, state: { path: '1', address: ['root', 'B'] } },
      false
    )
  ).toBeNull()
  expect(
    copyZoom(
      artwork,
      model,
      parent,
      { ...child, state: { path: '1', address: ['root', 'A', 'A'] } },
      false
    )
  ).toBeNull()
  expect(copyZoom({ ...artwork, frames: [] }, model, parent, child, false)).toBeNull()
  expect(
    copyZoom(
      { ...artwork, views: [{ paths: ['1'], bounds: [60, 60, 20, 20] }] },
      model,
      parent,
      child,
      false
    )
  ).toBeNull()
})

it('selects one starting line without erasing the opposite descent or setup', () => {
  const next = { ...claim, ...selectProofStart(claim, 'from', { path: '3', address: [] }) }
  expect(next.first).toEqual([])
  expect(next.second).toBe(claim.second)
  expect(next.setup?.second).toBe(claim.setup?.second)
  expect(next.period).toEqual([])
  expect(selectProofStart({ ...claim, rule: 'cantorHop' }, 'to', child.state)).toMatchObject({
    first: [],
  })
})

it('round trips optional connection names without changing old unnamed certificates', () => {
  const doc = pathDocument('named', 'Named routes', {
    ...model,
    claims: [claim, { ...claim, id: 'named', name: 'My descent' }],
  })
  expect(fmazeImportAdapter.import(fmazeExportAdapter.export(doc))).toEqual(doc)
})
