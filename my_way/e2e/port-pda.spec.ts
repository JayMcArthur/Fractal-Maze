import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'
import type { RecursiveMazeDocument } from '../src/core/model/RecursiveMazeDocument'
import { defaultRenderConfig } from '../src/core/model/renderConfig'

const imported: RecursiveMazeDocument = {
  formatVersion: '1.0', representationType: 'recursivePorts',
  metadata: { id: 'root-replacement', title: 'Root replacement', author: 'PDA test', tags: [],
    createdAt: '2026-10-10T12:00:00Z', updatedAt: '2026-10-10T12:00:00Z' },
  definition: { type: 'recursivePorts', blocks: ['A', 'B'], stayKeepsBlock: false,
    start: { blocks: [0], port: 0 }, goal: { blocks: [1], port: 3 },
    rules: [[1, 0, 1, 0, 1], [0, 1, 0, 1, 2], [1, 2, -1, -1, 4],
      [1, 4, 0, 1, 3], [1, 0, 0, 1, 3]] },
  renderConfig: defaultRenderConfig,
  solverConfig: { strategy: 'bfs', maxDepth: 5, maxNodes: 10000, timeoutMs: 5000 }, annotations: [],
}

test('imported root and child replacements use block controls, keep depth and replay whole crossings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({ name: 'replacement.fmaze', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(imported)) })
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  const depth = page.locator('.digital-hud__metrics > div').filter({ hasText: 'Depth' }).locator('dd')
  const path = page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' }).locator('dd')
  await expect(depth).toHaveText('0')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Move east', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Enter A → path 1', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled()
  await expect(depth).toHaveText('1')
  await page.getByRole('button', { name: 'Cross → path 2', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled()
  await expect(depth).toHaveText('1')
  await expect(path).toHaveText('2')
  await expect(page.locator('.digital-hud__position')).toContainText('B')
  await page.getByRole('button', { name: 'Exit B → path 4', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled()
  await expect(depth).toHaveText('0')
  await page.getByRole('button', { name: 'Cross → path 3', exact: true }).click()
  await expect(page.locator('.path-controls')).toContainText('Finish reached.')
  await expect(depth).toHaveText('0')
  await expect(page.locator('.digital-hud__position')).not.toContainText('@surface')
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await expect(page.getByLabel('Replay position')).toHaveAttribute('max', '4')
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText('surface · 3')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const file = (await (await download).path())!
  const replay = JSON.parse(readFileSync(file, 'utf8'))
  expect(replay.nativeRoute.physical.moves).toHaveLength(4)
  expect(replay.nativeRoute.edges).toHaveLength(6)
  expect(replay.metrics.maxDepthReached).toBe(1)
  await page.getByLabel('Import replay', { exact: true }).setInputFiles(file)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await page.getByRole('button', { name: 'Return to play', exact: true }).click()
  await page.getByRole('link', { name: 'Solve & analyze', exact: false }).last().click()
  await expect(page.getByLabel('PDA method')).toHaveValue('balanced')
  await page.getByRole('button', { name: 'Find finite route', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save & play replay', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await expect(page.getByLabel('Replay position')).toHaveAttribute('max', '1')
})

test('old bundled port solutions play on the shared block/source canvas and keep their export', async ({ page }) => {
  await page.goto('play/ports-koteitan?replay=bundled-ports-koteitan')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await page.getByRole('button', { name: 'Play replay', exact: true }).click()
  await expect(page.getByLabel('Replay position')).not.toHaveValue('0')
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.path-replay .format-status')).toContainText('surface')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const replay = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(replay.nativeRoute.type).toBe('recursivePorts')
  expect(replay.maze.definition.type).toBe('recursivePorts')
  expect(replay.status).toBe('complete')
})
