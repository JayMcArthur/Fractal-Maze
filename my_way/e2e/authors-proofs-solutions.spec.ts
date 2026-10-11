import { test, expect } from './fixtures'

test('Library groups authors, filters them and keeps source views together', async ({ page }) => {
  await page.goto('library')
  const collection = page.getByRole('region', { name: 'Jay McArthur', exact: true })
  await expect(collection.getByRole('heading', { name: 'A Long Path', exact: true })).toBeVisible()
  await expect(collection.locator('.maze-view-select select, select')).toHaveCount(1)
  await page.getByLabel('Author', { exact: true }).selectOption('Snuke')
  await expect(page.locator('.author-collection')).toHaveCount(1)
  await expect(page.locator('.author-collection > .section-heading')).toContainText('Snuke')
  await page.getByRole('button', { name: /Reference artwork/ }).click()
  await expect(page.locator('.author-collection')).toHaveCount(1)
  await expect(page.locator('.author-collection .library-card')).toHaveCount(4)
})

test('Build choices fit a phone and open the requested workspace', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('build')
  await expect(page.locator('.build-choice')).toHaveCount(4)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Start a conversion →' }).click()
  await expect(page.getByLabel('Maze name')).toBeVisible()
})

test('two setup trails repeat at one scope, compose a solution and replay its checked proof', async ({
  page,
}) => {
  await page.goto('workbench/simple-infinite-hop?tab=proof')
  await page.getByLabel('Build setup trails before the repeating part').check()
  await page
    .getByText('Advanced · copy addresses and shared starting copy', { exact: true })
    .click()
  await page.getByLabel('Claim scope').fill('A')
  await page.getByLabel('Repeating word').fill('AA')
  const left = page.locator('.witness').nth(0),
    right = page.locator('.witness').nth(1)
  await left
    .locator('.witness-setup')
    .getByRole('button', { name: 'enter A → 1', exact: true })
    .click()
  await right
    .locator('.witness-setup')
    .getByRole('button', { name: 'enter A → 2', exact: true })
    .click()
  for (let i = 0; i < 2; i++) {
    await left
      .locator(':scope > .witness-choices')
      .getByRole('button', { name: 'enter A → 1', exact: true })
      .click()
    await right
      .locator(':scope > .witness-choices')
      .getByRole('button', { name: 'enter A → 2', exact: true })
      .click()
  }
  await expect(page.getByRole('region', { name: 'Infinite trail comparison' })).toContainText(
    'Both repeating witnesses reach their targets'
  )
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('infinite-hop rules')
  await page.getByRole('button', { name: 'Save checked claim' }).click()
  await expect(page.getByText('Proven connections (1)', { exact: true })).toBeVisible()
  await page.getByLabel('Proof rule').selectOption('connection')
  await page.getByRole('button', { name: 'Use checked claim 1', exact: true }).click()
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await page.getByRole('button', { name: 'Save & play proof solution' }).click()
  await expect(page.locator('.replay-timeline')).toContainText('Step 0 of 1')
  await page.getByRole('button', { name: 'Play replay' }).click()
  await expect(page.locator('.replay-timeline')).toContainText('Step 1 of 1')
  await expect(page.locator('.replay-proof')).toContainText('A → A')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay' }).click()
  const path = (await (await download).path())!
  await page.goto('play/simple-infinite-hop')
  await page.getByLabel('Import replay').setInputFiles(path)
  await page.getByRole('button', { name: 'Seek to end' }).click()
  await expect(page.locator('.replay-proof')).toBeVisible()
})

test('shared solutions are visible on a fresh browser and proof examples do not fill the notebook', async ({
  page,
}) => {
  await page.goto('play/proof-maze-images-siggy-simple-cantor-maze-svg')
  await expect(page.getByRole('region', { name: 'Maze replays' })).toBeVisible()
  await page
    .getByLabel('Maze replay', { exact: true })
    .selectOption('bundled-proof-maze-images-siggy-simple-cantor-maze-svg')
  await page.getByRole('button', { name: 'Seek to end' }).click()
  await expect(page.locator('.replay-proof')).toBeVisible()
  await page.goto('workbench/proof-maze-images-siggy-simple-cantor-maze-svg?tab=proof')
  await expect(page.getByRole('heading', { name: 'Saved claims (0)' })).toBeVisible()
})

test('the original wire import uses the shared block controls', async ({
  page,
}) => {
  await page.goto('play/wolf-wire-original')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await expect(page.getByLabel('Display style')).toHaveValue('corridors')
  await page.getByRole('button', { name: 'Move north', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled()
  await expect(page.locator('iframe')).toHaveCount(0)
})

test('static-host redirects restore the selected workspace and its query', async ({ page }) => {
  await page.goto(
    '?route=' + encodeURIComponent('/Fractal-Maze/workbench/simple-infinite-hop?tab=proof')
  )
  await expect(page).toHaveURL(/\/workbench\/simple-infinite-hop\?tab=proof$/)
  await expect(page.getByRole('heading', { name: 'Your proof notebook' })).toBeVisible()
})

test('proof view keeps trails usable without artwork, histories or address settings covering the controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('workbench/simple-infinite-hop?tab=proof')
  await expect(page.locator('.proof-workbench svg')).toHaveCount(0)
  await expect(page.getByLabel('Claim from address')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Export PDA', exact: true })).not.toBeVisible()
  await page.locator('.workbench-exports summary').click()
  await expect(page.getByRole('button', { name: 'Export PDA', exact: true })).toBeVisible()
  const exportBox = await page
    .getByRole('button', { name: 'Export PDA', exact: true })
    .boundingBox()
  expect(exportBox!.x).toBeGreaterThanOrEqual(0)
  expect(exportBox!.x + exportBox!.width).toBeLessThanOrEqual(390)
  await page.locator('.workbench-exports summary').click()
  await page.getByLabel('Repeating word').fill('A')
  const left = page.locator('.witness').nth(0),
    right = page.locator('.witness').nth(1)
  await left.getByRole('button', { name: 'enter A → 1', exact: true }).click()
  await expect(left.locator('.witness-current')).toContainText('A · 1')
  await expect(left.locator('.witness-steps')).not.toBeVisible()
  await left.getByRole('button', { name: 'Undo witness step' }).click()
  await expect(left.locator('.witness-current')).toContainText('surface · 1')
  await left.getByRole('button', { name: 'enter A → 1', exact: true }).click()
  await right.getByRole('button', { name: 'enter A → 2', exact: true }).click()
  await left.locator('.witness-history summary').click()
  await expect(left.locator('.witness-steps li')).toHaveCount(2)
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('infinite-hop rules')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Save checked claim' }).click()
  await page.locator('.saved-claim > summary').click()
  await page.getByRole('button', { name: 'Revise claim' }).click()
  await expect(page.getByLabel('Repeating word')).toHaveValue('A')
  await expect(left.locator('.witness-current')).toContainText('A · 1')
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('infinite-hop rules')
})
