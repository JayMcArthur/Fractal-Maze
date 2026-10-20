import { test, expect } from './fixtures'
import { readFileSync } from 'node:fs'

test('block play replaces detours, searches the chosen expansion and records its depth', async ({
  page,
}) => {
  await page.goto('play/koteitan-block')
  await expect(page.getByLabel('Initial view detail')).toHaveValue('1')
  await page.getByLabel('Search detail').fill('4')
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  await page.getByRole('button', { name: 'Move west', exact: true }).click()
  await expect(page.locator('section .format-status')).toContainText('step 0')
  await page.getByRole('button', { name: 'Find finite route', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'No route in this depth-4 expansion' })
  ).toBeVisible()
  await page.getByLabel('Search detail').fill('5')
  await page.getByRole('button', { name: 'Find finite route', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Solution loaded' })).toBeVisible()
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await page.getByRole('button', { name: 'Play replay', exact: true }).click()
  await expect(page.getByLabel('Replay position')).not.toHaveValue('0')
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByText('Step 1756 of 1756', { exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const replay = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(replay.nativeRoute.type).toBe('fractalBlock')
  expect(new Set(replay.nativeRoute.details)).toEqual(new Set([5]))
  expect(replay.status).toBe('complete')
  expect(replay.metrics.totalMoves).toBe(1756)
})

test('editing a pattern drops its stale supplied route and keeps phone play usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('play/koteitan-block')
  await page.getByLabel('Initial view detail').fill('5')
  await expect(
    page.getByRole('button', { name: 'Load supplied solution', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cell 0,0: black', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Load supplied solution', exact: true })
  ).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByLabel('Edit pattern', { exact: true }).selectOption('start')
  await page.getByRole('button', { name: 'Cell 1,0: white', exact: true }).click()
  await page.getByRole('button', { name: 'Save pattern', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Pattern saved' })).toBeVisible()
  await page.reload()
  await expect(page.locator('section .format-status')).toContainText('detail 5')
})
