import { test, expect } from './fixtures'
import type { Locator } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function descend(board: Locator) {
  await board.getByRole('button', { name: 'Move south', exact: true }).click()
  await board.getByRole('button', { name: 'Move south', exact: true }).click()
  await board.getByRole('button', { name: /^Enter A to path / }).click()
  await expect(board.locator('.witness-maze__position')).toContainText('Depth 1')
}

for (const width of [390, 1440]) {
  test(`two maze boards construct, check and use a hop without typing a period at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('play/simple-infinite-hop')
    const live = page.locator('.path-player').getByTestId('source-player-marker')
    const point = [await live.getAttribute('cx'), await live.getAttribute('cy')]
    await page.getByRole('button', { name: 'Open proof notebook', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Proof notebook', exact: true })
    const left = dialog.getByRole('region', { name: 'Left trail', exact: true })
    const right = dialog.getByRole('region', { name: 'Right trail', exact: true })
    await expect(
      left.getByRole('img', { name: 'Playable source maze routes', exact: true })
    ).toBeVisible()
    await expect(
      right.getByRole('img', { name: 'Playable source maze routes', exact: true })
    ).toBeVisible()
    await expect(dialog.getByLabel('Repeating word', { exact: true })).not.toBeVisible()
    await descend(left)
    await expect(right.locator('.witness-maze__position')).toContainText('Depth 0')
    await expect(live).toHaveAttribute('cx', point[0]!)
    await expect(live).toHaveAttribute('cy', point[1]!)
    await descend(right)
    await expect(
      dialog.getByRole('status').filter({ hasText: 'Repeating copies: A.' })
    ).toBeVisible()
    const check = dialog.getByRole('button', { name: 'Check my proof', exact: true })
    const bounds = (await check.boundingBox())!
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.y + bounds.height).toBeLessThan(1000)
    await check.click()
    await expect(dialog.locator('.proof-valid')).toBeVisible()
    await dialog.getByRole('button', { name: 'Save checked claim', exact: true }).click()
    await dialog.getByRole('button', { name: 'Return to maze', exact: true }).click()
    const use = page.getByRole('button', { name: 'Use proof → path 2', exact: true })
    await expect(use).toBeInViewport()
    await use.click()
    await expect(page.locator('.path-controls [role=status]')).toHaveText('Finish reached.')
    await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export replay', exact: true }).click()
    const recorded = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
    expect(recorded.maze.definition.claims[0].period).toEqual(['A'])
    expect(recorded.nativeRoute.proofSteps[0].kind).toBe('lemma')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('witness keyboard focus isolates both boards and the underlying run', async ({ page }) => {
  await page.goto('play/simple-infinite-hop')
  await page.getByRole('button', { name: 'Open proof notebook', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Proof notebook', exact: true })
  const left = dialog.getByRole('region', { name: 'Left trail', exact: true })
  const right = dialog.getByRole('region', { name: 'Right trail', exact: true })
  await page.clock.install({ time: new Date('2026-10-20T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-10-20T12:01:00Z'))
  const live = await page.locator('.digital-hud').innerText()
  const before = await left.getByTestId('source-player-marker').getAttribute('cy')
  const other = await right.getByTestId('source-player-marker').getAttribute('cy')
  await left.locator('.witness-maze').focus()
  await page.keyboard.down('ArrowDown')
  await page.clock.runFor(2200)
  await page.keyboard.up('ArrowDown')
  await expect(left.getByTestId('source-player-marker')).not.toHaveAttribute('cy', before!)
  await expect(right.getByTestId('source-player-marker')).toHaveAttribute('cy', other!)
  await expect(right.locator('.witness-maze__position')).toContainText('Depth 0')
  const stopped = await left.getByTestId('source-player-marker').getAttribute('cy')
  await right.locator('.witness-maze').focus()
  await page.keyboard.press('ArrowDown')
  await page.clock.runFor(500)
  await expect(left.getByTestId('source-player-marker')).toHaveAttribute('cy', stopped!)
  await expect(right.getByTestId('source-player-marker')).not.toHaveAttribute('cy', other!)
  expect(await page.locator('.digital-hud').innerText()).toBe(live)
})

test('different descents cannot be submitted as a matching repetition', async ({ page }) => {
  await page.goto('play/simple-infinite-hop')
  await page.getByRole('button', { name: 'Open proof notebook', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Proof notebook', exact: true })
  const left = dialog.getByRole('region', { name: 'Left trail', exact: true })
  const right = dialog.getByRole('region', { name: 'Right trail', exact: true })
  await descend(left)
  await descend(right)
  await right.getByRole('button', { name: /^Enter A to path / }).click()
  await dialog.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await expect(dialog.locator('.proof-invalid')).toContainText('same repeating word')
  await expect(dialog.getByRole('button', { name: 'Save checked claim', exact: true })).toHaveCount(
    0
  )
  await right.getByRole('button', { name: 'Undo witness step', exact: true }).click()
  await dialog.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await expect(dialog.locator('.proof-valid')).toBeVisible()
})

test('marking both repeat anchors infers the setup scope and keeps its certificate', async ({
  page,
}) => {
  await page.goto('play/simple-infinite-hop')
  await page.getByRole('button', { name: 'Open proof notebook', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Proof notebook', exact: true })
  const boards = [
    dialog.getByRole('region', { name: 'Left trail', exact: true }),
    dialog.getByRole('region', { name: 'Right trail', exact: true }),
  ]
  for (const board of boards) {
    await descend(board)
    await board.getByRole('button', { name: 'Start repetition here', exact: true }).click()
  }
  for (const board of boards) {
    await board.getByRole('button', { name: /^Enter A to path / }).click()
    await expect(board.locator('.witness-maze__position')).toContainText('Depth 2')
  }
  await expect(dialog.getByLabel('Claim scope', { exact: true })).not.toBeVisible()
  await expect(dialog.getByLabel('Repeating word', { exact: true })).not.toBeVisible()
  await dialog.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await expect(dialog.locator('.proof-valid')).toBeVisible()
  await dialog.getByRole('button', { name: 'Save checked claim', exact: true }).click()
  await dialog.getByRole('button', { name: 'Return to maze', exact: true }).click()
  await page.getByRole('button', { name: 'Use proof → path 2', exact: true }).click()
  await expect(page.locator('.path-controls [role=status]')).toHaveText('Finish reached.')
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const recorded = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  const proof = recorded.maze.definition.claims[0]
  expect(proof.scope).toEqual(['A'])
  expect(proof.period).toEqual(['A'])
  expect(proof.setup.first).toHaveLength(1)
  expect(proof.setup.second).toHaveLength(1)
})

test('a saved connection can be reused from the graphical boards to build a nested hop', async ({
  page,
}) => {
  await page.goto('play/simple-nested-infinite-hop')
  await page.getByRole('button', { name: 'Open proof notebook', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Proof notebook', exact: true })
  await dialog.getByLabel('Claim to path', { exact: true }).selectOption('2')
  const left = dialog.getByRole('region', { name: 'Left trail', exact: true })
  const right = dialog.getByRole('region', { name: 'Right trail', exact: true })
  await descend(left)
  await descend(right)
  await dialog.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save checked claim', exact: true }).click()
  await left.getByRole('button', { name: 'Use checked claim 1', exact: true }).click()
  await expect(left.locator('.witness-maze__position')).toContainText('Path 2')
  await left.getByRole('button', { name: 'Enter B to path 1', exact: true }).click()
  await right.getByRole('button', { name: 'Enter B to path 3', exact: true }).click()
  await expect(dialog.getByRole('status').filter({ hasText: 'Repeating copies: B.' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await expect(dialog.locator('.proof-valid')).toBeVisible()
  await dialog.getByRole('button', { name: 'Save checked claim', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: 'Saved claims (2)', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Return to maze', exact: true }).click()
  await page.getByRole('button', { name: 'Use proof → path 3', exact: true }).click()
  await expect(page.locator('.path-controls [role=status]')).toHaveText('Finish reached.')
})
