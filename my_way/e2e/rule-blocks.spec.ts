import { compactBlockArtwork } from '../src/core/play/compactBlockArtwork'
import { createBlockArtwork } from '../src/core/play/blockArtwork'
import type { ReplayDocument } from '../src/core/replay/ReplayDocument'
import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'

const ids = [
  'pda-guide-2',
  'pda-guide-3',
  'pda-guide-4',
  'pda-guide-6',
  'simple-infinite-hop',
  'simple-nested-infinite-hop',
]
const bundles: { id: string; mazeId: string; asset: string }[] = JSON.parse(
  readFileSync('src/data/manifests/shared-replays.json', 'utf8')
)

for (const id of ids) {
  test(`${id} plays as physical blocks with undo and exports the original model`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`play/${id}`)
    const marker = page.getByTestId('source-player-marker')
    await expect(marker).toBeVisible()
    const example = id.startsWith('simple-')
    const grid = example || id === 'pda-guide-3' || id === 'pda-guide-6'
    const axis = grid ? 'cy' : 'cx'
    const before = await marker.getAttribute(axis)
    await page
      .getByRole('button', {
        name: example || id === 'pda-guide-6' ? 'Move south' : grid ? 'Move north' : 'Move east',
        exact: true,
      })
      .click()
    await expect(marker).not.toHaveAttribute(axis, before!)
    await page.getByRole('button', { name: 'Undo move', exact: true }).click()
    await expect(marker).toHaveAttribute(axis, before!)
    await expect(page.locator('.path-state-map')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Move north', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Export', exact: true }).click()
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    const exported = JSON.parse(readFileSync((await (await downloading).path())!, 'utf8'))
    expect(exported.metadata.id).toBe(id)
    expect(exported.artwork?.blockSize).toBeUndefined()
    expect(errors).toEqual([])
  })

  test(`${id} shared solution plays in blocks, reaches the finish and exports its unchanged snapshot`, async ({
    page,
    request,
  }) => {
    const bundle = bundles.find((bundle) => bundle.mazeId === id)!
    const original = await (await request.get(bundle.asset)).json()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`play/${id}`)
    await page.getByLabel('Maze replay', { exact: true }).selectOption(bundle.id)
    await expect(page.getByLabel('Replay playback')).toBeVisible()
    await expect(page.getByTestId('source-player-marker')).toBeVisible()
    await expect(page.locator('.path-state-map')).toHaveCount(0)
    await page.getByRole('button', { name: 'Play replay', exact: true }).click()
    await expect(page.getByLabel('Replay position')).not.toHaveValue('0')
    await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
    const finish = page
      .locator('.path-replay svg g')
      .filter({ has: page.locator('text').filter({ hasText: /^Finish$/ }) })
      .locator('circle')
    await expect(finish).toBeVisible()
    await expect
      .poll(async () => {
        const marker = page.getByTestId('source-player-marker')
        return Math.hypot(
          Number(await marker.getAttribute('cx')) - Number(await finish.getAttribute('cx')),
          Number(await marker.getAttribute('cy')) - Number(await finish.getAttribute('cy'))
        )
      })
      .toBeLessThan(0.001)
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export replay', exact: true }).click()
    expect(JSON.parse(readFileSync((await (await downloading).path())!, 'utf8'))).toEqual(original)
    expect(errors).toEqual([])
  })
}

test('rule-only Build preview and solver recording use the same physical block layout', async ({
  page,
}) => {
  await page.goto('workbench/pda-guide-6?tab=play')
  await expect(page.getByTestId('source-player-marker')).toHaveAttribute('cy', '0.5')
  await page.getByRole('button', { name: 'Move south', exact: true }).click()
  await expect(page.getByTestId('source-player-marker')).toHaveAttribute('cy', '1.5')
  await page.goto('solver?id=pda-guide-6')
  await page.getByRole('button', { name: 'Find finite route', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save & play replay', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByTestId('source-player-marker')).toHaveAttribute('cy', '10.5')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const recorded = JSON.parse(readFileSync((await (await downloading).path())!, 'utf8'))
  expect(recorded.nativeRoute.physical.moves.length).toBeGreaterThan(0)
  expect(recorded.status).toBe('complete')
})

test('a one-path imported maze remains playable and records the walk to its finish', async ({
  page,
}) => {
  const bundle = bundles.find((bundle) => bundle.mazeId === 'simple-infinite-hop')!
  const doc = JSON.parse(readFileSync(`public/${bundle.asset}`, 'utf8')).maze
  doc.metadata = { ...doc.metadata, id: 'one-path-browser', title: 'One path' }
  doc.representationType = 'pathPushdown'
  doc.definition = {
    ...doc.definition,
    type: 'pathPushdown',
    allowedRule: 'finite',
    copies: [],
    connections: [],
    claims: [],
    goal: doc.definition.start,
  }
  delete doc.artwork
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  await page
    .locator('input[type=file]')
    .setInputFiles({
      name: 'one-path.fmaze',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(doc)),
    })
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  const marker = page.getByTestId('source-player-marker')
  await expect(marker).toBeVisible()
  const start = await marker.getAttribute('cx')
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  await expect(marker).not.toHaveAttribute('cx', start!)
  await page.goto('solver?id=one-path-browser')
  await page.getByRole('button', { name: 'Find finite route', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save & play replay', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  const finish = page
    .locator('.path-replay svg g')
    .filter({ has: page.locator('text').filter({ hasText: /^Finish$/ }) })
    .locator('circle')
  await expect
    .poll(
      async () => Number(await marker.getAttribute('cx')) - Number(await finish.getAttribute('cx'))
    )
    .toBe(0)
  await expect(page.locator('.replay-timeline')).toContainText('Step 1 of 1')
})

test('a recorded rule-only run keeps its original source document and selected block geometry', async ({ page }) => {
  const bundle = bundles.find(bundle => bundle.mazeId === 'pda-guide-6')!
  const original = JSON.parse(readFileSync(`public/${bundle.asset}`, 'utf8')).maze
  await page.goto('play/pda-guide-6')
  await page.getByRole('button', { name: 'Move south', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save & play replay', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByTestId('source-player-marker')).toHaveAttribute('cy', '1.5')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const recorded = JSON.parse(readFileSync((await (await downloading).path())!, 'utf8'))
  expect(recorded.maze.artwork).toEqual(original.artwork)
  expect(recorded.playArtwork.blockSize).toBe(1)
  expect(recorded.nativeRoute.physical.moves).toHaveLength(1)
})

test('Inner Frame room entry continues by keyboard in blocks', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('play/draft-maze-images-the-inner-frame-pdf')
    await page.getByLabel('Local view', { exact: true }).uncheck()
    const board = page.getByRole('img', { name: 'Playable source maze routes', exact: true })
    const bundle = bundles.find(bundle => bundle.mazeId === 'draft-maze-images-the-inner-frame-pdf')!
    const original = JSON.parse(readFileSync(`public/${bundle.asset}`, 'utf8')) as ReplayDocument
    const model = original.maze.definition
    if (model.type !== 'pathPushdown') throw new Error('Expected Inner Frame path model')
    const before = createBlockArtwork(original.maze.artwork!, model)
    const compact = compactBlockArtwork(original.maze.artwork!, model)
    const oldTarget = [215.6875, 252.125]
    const traceIndex = before.traces.findIndex(trace => trace.points.some(point =>
      Math.hypot(point[0] - oldTarget[0], point[1] - oldTarget[1]) < 1e-6))
    expect(traceIndex).toBeGreaterThanOrEqual(0)
    const vertex = before.traces[traceIndex].points.findIndex(point =>
      Math.hypot(point[0] - oldTarget[0], point[1] - oldTarget[1]) < 1e-6)
    const target = compact.traces[traceIndex].points[vertex]
    await board.scrollIntoViewIfNeeded()
    const screen = await board.evaluate((svg, point) => {
      const screen = new DOMPoint(...point).matrixTransform((svg as SVGSVGElement).getScreenCTM()!)
      return { x: screen.x, y: screen.y }
    }, target)
    await page.mouse.click(screen.x, screen.y)
    await expect
      .poll(async () =>
        Math.abs(
          Number(await page.getByTestId('source-player-marker').getAttribute('cx')) - target[0]
        )
      )
      .toBeLessThan(0.0001)
    const east = page.getByRole('button', { name: 'Move east', exact: true })
    await expect(east).toBeEnabled()
    const gate = compact.gates!.find(gate => gate.edge === 'room-0-enter')!
    const steps = Math.round((gate.from[0] - target[0]) / compact.blockSize!)
    expect(steps).toBeGreaterThan(0)
    for (let step = 1; step <= steps; step++) {
      await expect(east).toBeEnabled()
      await page.keyboard.press('ArrowRight')
      await expect.poll(async () => Number(await page.getByTestId('source-player-marker').getAttribute('cx')))
        .toBeCloseTo(target[0] + compact.blockSize! * step, 6)
    }
    await expect(east).toBeEnabled()
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Depth' })).toContainText('1')
    await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })).toContainText('Y · left')
  })
