import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'

test('Omeometo keyboard movement continues after using the touch controls', async ({ page }) => {
  await page.goto('play/koteitan-block')
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  await expect(page.locator('section .format-status')).toContainText('step 1')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('section .format-status')).toContainText('step 0')
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('section .format-status')).toContainText('step 1')
})

test('Omeometo player fits inside a passage at the selected expansion scale', async ({ page }) => {
  await page.goto('play/koteitan-block')
  const canvas = page.locator('.block-route-canvas')
  await expect(canvas).toBeVisible()
  const overview = page.getByLabel('Whole maze and current view', { exact: true })
  await expect(overview).toBeVisible()
  const walls = await overview.evaluate((node: HTMLCanvasElement) => {
    const pixels = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data
    let count = 0
    for (let i = 0; i < pixels.length; i += 4)
      if (pixels[i] === 24 && pixels[i + 1] === 24 && pixels[i + 2] === 24) count++
    return count
  })
  expect(walls).toBeGreaterThan(0)
  const depth = Number(await page.getByLabel('Initial view detail').inputValue())
  const zoom = await page.getByLabel('Zoom around player').isChecked()
  const marker = await canvas.evaluate((node: HTMLCanvasElement) => {
    const pixels = node.getContext('2d')!.getImageData(0, 0, node.width, node.height).data
    const xs: number[] = []
    for (let index = 0; index < pixels.length; index += 4)
      if (pixels[index] === 240 && pixels[index + 1] === 180 && pixels[index + 2] === 41)
        xs.push((index / 4) % node.width)
    return { diameter: Math.max(...xs) - Math.min(...xs) + 1, width: node.width }
  })
  expect(marker.diameter).toBeGreaterThan(0)
  const cell = marker.width / (zoom ? Math.min(4 ** depth, 64) : 4 ** depth)
  expect(marker.diameter).toBeLessThanOrEqual(Math.ceil(cell))
})

test('Sierpinski crossing updates both copy levels without stopping at a bookkeeping point', async ({
  page,
}) => {
  await page.goto('play/draft-maze-images-siggy-skeptic-play-2-jpg')
  await page.getByRole('button', { name: 'Enter B → A to path 5', exact: true }).click()
  await expect(
    page.locator('.digital-hud__metrics > div').filter({ hasText: 'Depth' })
  ).toContainText('2')
  await expect(
    page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })
  ).toContainText('5')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo move', exact: true }).click()
  await expect(
    page.locator('.digital-hud__metrics > div').filter({ hasText: 'Depth' })
  ).toContainText('0')
  await expect(
    page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })
  ).toContainText('4')
  await page.getByRole('button', { name: 'Enter B → A to path 5', exact: true }).click()
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const file = (await (await download).path())!
  const replay = JSON.parse(readFileSync(file, 'utf8'))
  expect(replay.nativeRoute.states).toEqual([
    { path: '4', address: [] },
    { path: '7', address: ['B'] },
    { path: '5', address: ['B', 'A'] },
  ])
  expect(replay.nativeRoute.edges).toEqual(['boundary-8-enter', 'boundary-9-enter'])
  expect(replay.metrics.maxDepthReached).toBe(2)
  await page.goto('play/draft-maze-images-siggy-skeptic-play-2-jpg')
  await page.getByLabel('Import replay').setInputFiles(file)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText('BA · 5')
})

test('Skeptic Play 1 SVG depth changes when the marker crosses the copy boundary', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-10T12:00:00Z') })
  await page.goto('play/draft-maze-images-siggy-skeptic-play-1-svg')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await page.clock.pauseAt(new Date('2026-10-10T12:01:00Z'))
  const depth = page
    .locator('.digital-hud__metrics > div')
    .filter({ hasText: 'Depth' })
    .locator('dd')
  await page.getByRole('button', { name: 'Enter A → path 2', exact: true }).click()
  await expect(depth).toHaveText('0')
  await page.clock.runFor(6000)
  await expect(depth).toHaveText('1')
  await page.getByRole('button', { name: 'Enter A → path 5', exact: true }).click()
  await expect(depth).toHaveText('1')
  await page.clock.runFor(6000)
  await expect(depth).toHaveText('2')
  await page.getByRole('button', { name: 'Exit A → path 2', exact: true }).click()
  await expect(depth).toHaveText('2')
  await page.clock.runFor(6000)
  await expect(depth).toHaveText('1')
  await page.getByRole('button', { name: 'Exit A → path 1', exact: true }).click()
  await page.clock.runFor(6000)
  await expect(depth).toHaveText('0')
})

test('Snuke block movement keeps its logical position and updates the parent-copy dot', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-10T12:00:00Z') })
  await page.goto('play/draft-maze-images-snuke-snuke-3-png')
  await page.clock.pauseAt(new Date('2026-10-10T12:01:00Z'))
  await expect(page.getByLabel('Display style')).toHaveCount(0)
  await page.getByRole('button', { name: 'Enter L → path Port 1', exact: true }).click()
  await page.clock.runFor(6000)
  const parent = page.getByTestId('parent-player-marker')
  await expect(parent).toBeVisible()
  const before = await parent.getAttribute('cy')
  await page.keyboard.press('ArrowDown')
  await page.clock.runFor(6000)
  expect(await parent.getAttribute('cy')).not.toBe(before)
  const depth = page
    .locator('.digital-hud__metrics > div')
    .filter({ hasText: 'Depth' })
    .locator('dd')
  await expect(depth).toHaveText('1')
  const marker = page.getByTestId('source-player-marker')
  const path = page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' }).locator('dd')
  const currentPath = await path.textContent()
  await page.clock.runFor(100)
  await expect(depth).toHaveText('1')
  await expect(path).toHaveText(currentPath!)
  await expect(marker).toBeVisible()
  expect(await page.locator('.source-artwork').first().evaluate(svg => {
    const marker = svg.querySelector('[data-testid="source-player-marker"]')!
    const point = new DOMPoint(Number(marker.getAttribute('cx')), Number(marker.getAttribute('cy')))
    return [...svg.querySelectorAll('polyline')].some(line => line.isPointInStroke(point))
  })).toBe(true)
  await expect(
    page.getByRole('img', { name: 'Playable source maze routes' }).locator('image')
  ).toHaveCount(0)
})
