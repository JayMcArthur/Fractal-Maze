import { test, expect } from './fixtures'
import { readFileSync } from 'node:fs'

test('Backlot enforces drawing rules, replaces undone moves and saves a playable replay', async ({
  page,
}) => {
  await page.goto('play/backlot')
  await expect(page.getByRole('heading', { name: 'Backlot', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Move south', exact: true }).click()
  await expect(page.locator('.format-status')).toContainText('step 1')
  await page.getByRole('button', { name: 'Move north', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('cannot cross or backtrack')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.format-status')).toContainText('step 0')
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  await expect(page.locator('.format-status')).toContainText('step 1')
  await expect(page.getByRole('button', { name: 'Next step', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await expect(page).toHaveURL(/play\/backlot\?replay=/)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByText('Step 1 of 1', { exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const replay = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(replay.nativeRoute.states.at(-1).rooms[0].cells).toEqual([4, 5])
  expect(replay.metrics.totalMoves).toBe(1)
})

test('the optional Backlot solution plays, seeks, persists and exports all six rooms', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('play/backlot')
  await expect(page.locator('.format-status')).toContainText('step 0')
  await page.getByLabel('Maze replay', { exact: true }).selectOption('bundled-backlot')
  await page.getByRole('button', { name: 'Play replay', exact: true }).click()
  await expect(page.getByLabel('Replay position')).not.toHaveValue('0')
  await page.getByRole('button', { name: 'Pause replay', exact: true }).click()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByText('Step 337 of 337', { exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const replay = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(replay.status).toBe('complete')
  expect(replay.nativeRoute.states.at(-1).rooms).toHaveLength(6)
  expect(replay.metrics.maxDepthReached).toBe(3)
  await page.reload()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByText('Step 337 of 337', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('Backlot phone controls and the original Omeometo source are reachable from the Library', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('play/backlot')
  await expect(page.getByRole('button', { name: 'Move south', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Move south', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.goto('reference/source-omeometo-block')
  await page.getByRole('link', { name: 'Play this maze', exact: false }).click()
  await expect(
    page.getByRole('heading', { name: 'Omeometo — fractal block maze', exact: true })
  ).toBeVisible()
  await expect(page.getByLabel('Initial view detail')).toHaveValue('1')
})
