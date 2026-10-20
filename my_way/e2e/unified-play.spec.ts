import { test, expect } from './fixtures'

const sourceAlice = 'draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png'

test('Wolfram 2 keeps its original solutions while offering only photograph and block views', async ({ page }) => {
  await page.goto('play/draft-maze-images-mark-j-p-wolf-wolfram-2-jpg')
  await expect(page.getByLabel('Maze view', { exact: true }).locator('option')).toHaveCount(2)
  const replay = page.getByLabel('Maze replay', { exact: true })
  const originals = replay.locator('option[value^="bundled-wire-"]')
  await expect(originals).toHaveCount(11)
  const id = (await originals.first().getAttribute('value'))!
  await replay.selectOption(id)
  await expect(page).toHaveURL(new RegExp(`/play/wolf-wire-original\\?replay=${id}$`))
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export replay', exact: true })).toBeVisible()
  await expect(page.getByLabel('Maze replay', { exact: true })).toHaveValue(id)
})

test('block keyboard movement advances a cell and undo restores the start', async ({ page }) => {
  await page.goto(`play/${sourceAlice}`)
  const marker = page.getByTestId('source-player-marker')
  await expect(marker).toBeVisible()
  const start = [await marker.getAttribute('cx'), await marker.getAttribute('cy')]
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled()
  const next = [await marker.getAttribute('cx'), await marker.getAttribute('cy')]
  expect(next).not.toEqual(start)
  await expect(page.locator('.digital-hud__position')).toContainText('Surface')
  await expect(page.getByLabel('Display style')).toHaveCount(0)
  await page.waitForTimeout(150)
  expect([await marker.getAttribute('cx'), await marker.getAttribute('cy')]).toEqual(next)
  await page.getByRole('button', { name: 'Undo move', exact: true }).click()
  expect([await marker.getAttribute('cx'), await marker.getAttribute('cy')]).toEqual(start)
  await expect(page.getByRole('button', { name: 'Save & play replay' })).toBeDisabled()
})

test('replays belong to their maze in Play and never appear in Library or the main navigation', async ({
  page,
}) => {
  await page.goto('library')
  await expect(page.getByRole('link').filter({ hasText: /replay/i })).toHaveCount(0)
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link')
      .filter({ hasText: /Replays|Guide|^Analyze$/ })
  ).toHaveCount(0)
  await page.goto(`play/${sourceAlice}`)
  const bar = page.getByRole('region', { name: 'Maze replays', exact: true })
  await expect(bar).toBeVisible()
  const field = (await page.locator('.path-player').boundingBox())!,
    bounds = (await bar.boundingBox())!
  expect(bounds.y).toBeGreaterThanOrEqual(field.y + field.height)
  await expect(
    page
      .getByLabel('Maze replay', { exact: true })
      .locator('option')
      .filter({ hasText: 'Source-derived blocks' })
  ).toHaveCount(1)
  await expect(
    page
      .getByLabel('Maze replay', { exact: true })
      .locator('option')
      .filter({ hasText: 'Block remake' })
  ).toHaveCount(1)
  await page.getByLabel('Maze replay', { exact: true }).selectOption(`bundled-${sourceAlice}`)
  await expect(page).toHaveURL(new RegExp(`/play/${sourceAlice}\\?replay=`))
  await page.getByRole('button', { name: 'Play replay' }).click()
  await expect(page.locator('.replay-timeline')).not.toContainText('Step 0 of')
  await page.getByRole('button', { name: 'Return to play', exact: true }).click()
  await expect(page.locator('.digital-hud__position')).toContainText('Surface')
  await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })).toContainText('5')
})

test('solver filters families and the same fourteen-state Alice PDA produces a legal block replay', async ({
  page,
}) => {
  await page.goto('solver')
  await page.getByLabel('Search solver mazes').fill('Alice')
  await expect(page.getByRole('group', { name: 'Matching mazes' }).getByRole('button')).toHaveCount(
    1
  )
  await page.getByRole('group', { name: 'Matching mazes' }).getByRole('button').click()
  await page.getByLabel('Solver maze view').selectOption('alice-in-wonderland')
  await expect(page.locator('.pda-solver .session-grid')).toContainText('Path states14')
  await page.getByRole('button', { name: 'Find finite route', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('24 PDA transitions')
  await page.getByRole('button', { name: 'Play solution', exact: true }).click()
  await expect(page).toHaveURL(/\/play\/alice-in-wonderland\?replay=/)
  await expect(page.locator('.replay-field canvas')).toBeVisible()
  await page.getByRole('button', { name: 'Seek to end' }).click()
  await expect(page.locator('.replay-summary')).toContainText('complete')
})

for (const width of [1440, 390])
  test(`unified play, replay bar, solver and Home fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    for (const path of [
      '',
      `play/${sourceAlice}`,
      'play/alice-in-wonderland',
      'solver?id=alice-in-wonderland',
    ]) {
      await page.goto(path)
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
      if (path.startsWith('play'))
        await expect(page.getByLabel('Maze replay', { exact: true })).toBeVisible()
      if (path.startsWith('solver'))
        await expect(page.getByRole('heading', { name: 'Simplified PDA' })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
    }
    expect(errors).toEqual([])
  })

test('author and maze-type filters lead directly to finite search or the proof notebook', async ({
  page,
}) => {
  await page.goto('solver')
  await page.getByLabel('Solver author', { exact: true }).selectOption('Siggy')
  await page.getByLabel('Solver maze type', { exact: true }).selectOption('infinite')
  const choices = page.getByRole('group', { name: 'Matching mazes' }).getByRole('button')
  await expect(choices).toHaveCount(3)
  await page.getByRole('button', { name: 'First Cantor Siggy', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Construct an infinite proof' })).toBeVisible()
  await page.getByRole('link', { name: 'Construct an infinite proof' }).click()
  await expect(page.getByRole('heading', { name: 'Your proof notebook' })).toBeVisible()
  await page.goto('solver')
  await page.getByLabel('Solver maze type', { exact: true }).selectOption('corridors')
  await page.getByLabel('Search solver mazes').fill('Alice')
  await page.getByRole('group', { name: 'Matching mazes' }).getByRole('button').click()
  await expect(page.getByLabel('Solver maze view')).toHaveValue('alice-in-wonderland')
})

test('solving a workbench preview saves the current edits instead of loading the old model', async ({
  page,
}) => {
  await page.goto('workbench/pda-guide-1')
  await page.getByLabel('Maze name', { exact: true }).fill('Edited preview maze')
  await page.getByRole('tab', { name: 'Play preview', exact: true }).click()
  await page.getByRole('button', { name: 'Save & solve', exact: true }).click()
  await expect(page).toHaveURL(/solver\?id=pda-guide-1$/)
  await expect(
    page.getByRole('heading', { name: 'Edited preview maze', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Find finite route', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('28 PDA transitions')
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.replay-summary')).toContainText('complete')
})
