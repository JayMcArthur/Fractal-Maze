import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'
import type { Locator, Page } from '@playwright/test'
import type { ProofClaim, ProofStep } from '../src/core/model/pathMaze'
import solutions from '../src/data/mazes/catalog-solutions.json' with { type: 'json' }
import sources from '../src/data/mazes/infinite-fixtures.json' with { type: 'json' }

const id = 'proof-maze-images-siggy-first-cantor-svg'
const certificate = solutions.find(row => row.mazeId === id)!.claims![0] as ProofClaim
const source = sources.find(row => row.title === 'First Cantor')!
const descentId = 'proof-maze-images-siggy-infinite-descent-svg'
const descent = solutions.find(row => row.mazeId === descentId)!.claims![0] as ProofClaim
const descentSource = sources.find(row => row.title === 'Infinite Descent')!
const obligations = [
  { id: certificate.id, from: certificate.from, to: certificate.to, witness: certificate.first },
  ...certificate.companions!,
]

async function buildWitness(panel: Locator, steps: ProofStep[], pairs = source.pairs) {
  for (const step of steps) {
    let label: string
    if (step.kind === 'edge') {
      const index = Number(step.reference.split('-')[1])
      const [pair, operation] = pairs[index]
      const [from, to] = pair.split('-')
      label = step.reference.endsWith('-in') ? `enter ${operation.slice(1)} → ${to}` : `exit ${operation.slice(1)} → ${from}`
    } else {
      const index = obligations.findIndex(pair => pair.id === step.reference)
      label = `Use descendant hypothesis${index ? ` ${index + 1}` : ''}${step.reverse ? ' backwards' : ''}`
    }
    await panel.getByRole('button', { name: label, exact: true }).click()
  }
}

async function playCheckedProof(page: Page, finish: string) {
  await page.getByRole('tab', { name: 'Play preview', exact: true }).click()
  await page.getByRole('button', { name: `Use proof → path ${finish}`, exact: true }).click()
  await expect(page.locator('.path-controls [role=status]')).toHaveText('Finish reached.')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `docs/screenshots/live-proofs/path-${finish}-blocks.png`, fullPage: true })
  await expect(page.locator('.path-controls [role=status]')).toHaveText('Finish reached.')
  await page.getByRole('button', { name: 'Undo move', exact: true }).click()
  await expect(page.locator('.path-controls [role=status]')).not.toHaveText('Finish reached.')
  await page.getByRole('button', { name: `Use proof → path ${finish}`, exact: true }).click()
  await expect(page.locator('.path-controls [role=status]')).toHaveText('Finish reached.')
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await page.getByRole('combobox', { name: 'Speed', exact: true }).selectOption('0.5')
  await page.getByRole('button', { name: 'Play replay', exact: true }).click()
  await expect(page.locator('.replay-timeline')).toContainText('Step 1 of 1')
  await page.getByRole('button', { name: 'Pause replay', exact: true }).click()
  const marker = page.getByTestId('source-player-marker')
  const pausedPoint = [await marker.getAttribute('cx'), await marker.getAttribute('cy')]
  await page.waitForTimeout(180)
  expect([await marker.getAttribute('cx'), await marker.getAttribute('cy')]).toEqual(pausedPoint)
  await page.getByRole('button', { name: 'Play replay', exact: true }).click()
  // Infinite Descent's source travel takes 7.6 seconds at half speed.
  await expect(page.getByRole('button', { name: 'Pause replay', exact: true })).toHaveCount(0, { timeout: 12000 })
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText(`surface · ${finish}`)
  await expect(page.locator('.replay-proof')).toBeVisible()
  await expect(page.locator('.path-replay')).toContainText(`Use checked connection · path ${finish === '12' ? '6' : '1'} → path ${finish}`)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const file = (await (await download).path())!
  const replay = JSON.parse(readFileSync(file, 'utf8'))
  expect(replay.nativeRoute.physical.moves.at(-1).kind).toBe('lemma')
  expect(replay.nativeRoute.proofSteps.at(-1).kind).toBe('lemma')
  const beforeImport = page.url()
  await page.getByLabel('Import replay', { exact: true }).setInputFiles(file)
  await expect(page).not.toHaveURL(beforeImport)
  await expect(page.locator('.replay-timeline')).toContainText('Step 0 of 1')
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText(`surface · ${finish}`)
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  const point = replay.nativeRoute.physical.positions.at(-1).point
  await expect(page.getByTestId('source-player-marker')).toHaveAttribute('cx', String(point[0]), { timeout: 12000 })
  await expect(page.getByTestId('source-player-marker')).toHaveAttribute('cy', String(point[1]), { timeout: 12000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: `docs/screenshots/live-proofs/path-${finish}-source-replay.png`, fullPage: true })
}

test('First Cantor shared solution exposes every joint witness without filling the notebook', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`play/${id}?replay=bundled-${id}`)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText('surface · 12')
  await expect(page.locator('.saved-proof-witness')).toHaveCount(4)
  await expect(page.locator('.saved-proof-witness[open]')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const file = (await (await download).path())!
  const replay = JSON.parse(readFileSync(file, 'utf8'))
  expect(replay.maze.definition.start).toEqual({ path: '6', address: [] })
  expect(replay.maze.definition.claims[0].companions).toHaveLength(3)
  await page.getByLabel('Import replay', { exact: true }).setInputFiles(file)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.saved-proof-witness')).toHaveCount(4)
  await page.goto(`workbench/${id}?tab=proof`)
  await expect(page.getByRole('heading', { name: 'Saved claims (0)' })).toBeVisible()
})

test('the original Cantor solution can be constructed using only the notebook controls', async ({ page }) => {
  test.setTimeout(45000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`workbench/${id}?tab=proof`)
  await expect(page.getByLabel('Claim from path', { exact: true })).toHaveValue('6')
  await page.getByText('Related connections · optional', { exact: true }).click()
  for (const [index, pair] of certificate.companions!.entries()) {
    await page.getByRole('button', { name: 'Add related connection', exact: true }).click()
    await page.getByLabel(`Related ${index + 2} from path`, { exact: true }).selectOption(pair.from.path)
    await page.getByLabel(`Related ${index + 2} to path`, { exact: true }).selectOption(pair.to.path)
  }
  const panels = page.locator('section.witness')
  await buildWitness(panels.nth(0), certificate.first)
  await page.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('required witness routes')
  for (const [index, pair] of certificate.companions!.entries()) await buildWitness(panels.nth(index + 1), pair.witness)
  await page.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('Derivation checked under Cantor-hop rules')
  await page.getByRole('button', { name: 'Save checked claim', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Saved claims (1)' })).toBeVisible()
  await playCheckedProof(page, '12')
})

test('the restored Infinite Descent block branch enters A6', async ({ page }) => {
  await page.goto('play/proof-maze-images-siggy-infinite-descent-svg')
  await page.getByRole('button', { name: 'Enter A → path 6', exact: true }).click()
  await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Depth' })).toContainText('1')
  await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })).toContainText('6')
  await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Depth' })).toContainText('1')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
})

test('Infinite Descent shares its long-period proof and preserves both setup trails in export', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`play/${descentId}?replay=bundled-${descentId}`)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText('surface · 6')
  await expect(page.getByRole('region', { name: 'Infinite trail comparison' })).toContainText('forever')
  await expect(page.getByRole('region', { name: 'Infinite trail comparison' })).toContainText('The recorded trails repeat')
  await expect(page.getByRole('region', { name: 'Infinite trail comparison' })).not.toContainText('Check the proof')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const file = (await (await download).path())!
  const replay = JSON.parse(readFileSync(file, 'utf8'))
  expect(replay.maze.definition.claims[0].period).toHaveLength(12)
  expect(replay.maze.definition.claims[0].setup.first).toHaveLength(2)
  expect(replay.maze.definition.claims[0].setup.second).toHaveLength(2)
  await page.getByLabel('Import replay', { exact: true }).setInputFiles(file)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText('surface · 6')
})

test('the twelve-copy Infinite Descent repetition can be constructed on both sides', async ({ page }) => {
  test.setTimeout(45000)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(`workbench/${descentId}?tab=proof`)
  await expect(page.getByRole('heading', { name: 'Saved claims (0)' })).toBeVisible()
  await page.getByLabel('Repeating word', { exact: true }).fill(descent.period.join(' '))
  await page.getByText('Advanced · copy addresses and shared starting copy', { exact: true }).click()
  await page.getByLabel('Claim scope', { exact: true }).fill(descent.scope.join(' '))
  await page.getByLabel('Build setup trails before the repeating part', { exact: true }).check()
  const panels = page.locator('section.witness')
  for (const [index, side] of (['first', 'second'] as const).entries()) {
    await buildWitness(panels.nth(index).locator('.witness-setup .witness-choices'), descent.setup![side], descentSource.pairs)
  }
  await buildWitness(panels.nth(0).locator(':scope > .witness-choices'), descent.first, descentSource.pairs)
  await page.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('required witness routes')
  await buildWitness(panels.nth(1).locator(':scope > .witness-choices'), descent.second, descentSource.pairs)
  await page.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('Derivation checked under infinite-hop rules')
  await page.getByRole('button', { name: 'Save checked claim', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Saved claims (1)' })).toBeVisible()
  await playCheckedProof(page, '6')
})
