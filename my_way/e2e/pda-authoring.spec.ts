import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'
import { exportPathPDA } from '../src/core/pathMaze/exportPDA'
import type { PathMazeDefinition } from '../src/core/model/pathMaze'
import { connectionsFromText } from '../src/core/pathMaze/connectionInput'

const tiny: PathMazeDefinition = {
  type: 'pathPushdown', paths: ['path-one', 'path-two'].map(id => ({ id, label: id, color: '#3374a4', helper: false })),
  copies: ['A'], connections: [], start: { path: 'path-one', address: [] }, goal: { path: 'path-two', address: [] },
  allowedRule: 'finite', claims: [], review: 'wip', notes: [],
}

async function readExport(page: import('@playwright/test').Page) {
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export PDA', exact: true }).click()
  const path = (await (await download).path())!
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) }
}

test('an exported guide PDA imports as a new block maze, solves and records its physical solution', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('solver?id=pda-guide-1')
  const output = await readExport(page)
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles(output.path)
  await expect(page.getByText('Path PDA JSON', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  const marker = page.getByTestId('source-player-marker')
  await expect(marker).toBeVisible()
  const id = new URL(page.url()).pathname.split('/play/')[1]
  expect(id).not.toBe('pda-guide-1')
  await page.goto(`solver?id=${id}`)
  const imported = await readExport(page)
  expect(imported.data).toEqual(output.data)
  await page.getByRole('button', { name: 'Find finite route', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save & play replay', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await expect(page.getByLabel('Replay position')).toBeVisible()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(marker).toBeVisible()
  const replayDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const replay = JSON.parse(readFileSync((await (await replayDownload).path())!, 'utf8'))
  expect(replay.status).toBe('complete')
  expect(replay.nativeRoute.physical.moves.length).toBeGreaterThan(0)
  expect(errors).toEqual([])
})

test('text connections reject a partial batch, then build directed recursion that saves, reloads and plays', async ({ page }) => {
  await page.goto('workbench/new')
  await page.getByLabel('Maze name', { exact: true }).fill('Directed text maze')
  for (const name of ['Entrance', 'Finish']) {
    await page.getByLabel('New path label', { exact: true }).fill(name)
    await page.getByRole('button', { name: 'Add path', exact: true }).click()
  }
  await page.getByLabel('New copy label', { exact: true }).fill('A')
  await page.getByRole('button', { name: 'Add copy', exact: true }).click()
  await page.getByText('Enter connections as text', { exact: true }).click()
  const input = page.getByLabel('Connection lines', { exact: true })
  await input.fill('1 -> A.1\nA.B.1 -> 2')
  await page.getByRole('button', { name: 'Add connection lines', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Line 2')
  await expect(page.getByText('0 PDA transitions · inspect and remove', { exact: true })).toBeVisible()
  await input.fill('1 -> A.1\nA.1 -> Finish')
  await page.getByRole('button', { name: 'Add connection lines', exact: true }).click()
  await expect(page.getByText('2 PDA transitions · inspect and remove', { exact: true })).toBeVisible()
  await page.getByLabel('Start path', { exact: true }).selectOption('1')
  await page.getByLabel('Finish path', { exact: true }).selectOption('2')
  const output = await readExport(page)
  expect(output.data.transitions.filter((rule: { source: string }) => rule.source === output.data.transitions[0].source)).toHaveLength(2)
  await page.getByRole('button', { name: 'Save workbench', exact: true }).click()
  await expect(page.getByText('Saved to library', { exact: true })).toBeVisible()
  await page.reload()
  expect((await readExport(page)).data).toEqual(output.data)
  await page.getByRole('tab', { name: 'Play preview', exact: true }).click()
  await page.getByRole('button', { name: 'Enter A → path Entrance', exact: true }).click()
  await expect(page.locator('.path-state-caption')).toContainText('A · Entrance')
  await page.getByRole('button', { name: 'Exit A → path Finish', exact: true }).click()
  await expect(page.locator('.path-state-caption')).toContainText('surface · Finish')
})

test('the dropdown form preserves path IDs with hyphens and imports reject unsupported stack guards', async ({ page }) => {
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  const output = exportPathPDA({ ...tiny, connections: [{ id: 'walk', from: 'path-one', to: 'path-two', operation: 'walk', copy: '', input: '', evidence: 'test' }] }, 'Hyphen paths')
  const guarded = { ...output, transitions: output.transitions.slice(1) }
  await page.locator('input[type=file]').setInputFiles({ name: 'guarded.pda.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(guarded)) })
  await expect(page.getByText(/incomplete or duplicate stack guards/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load Maze', exact: true })).toBeDisabled()
  await page.locator('input[type=file]').setInputFiles({ name: 'tiny.pda.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exportPathPDA(tiny, 'Hyphen paths'))) })
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  const id = new URL(page.url()).pathname.split('/play/')[1]
  await page.goto(`workbench/${id}?tab=trace`)
  await page.getByLabel('Connection parent path', { exact: true }).selectOption('path-one')
  await page.getByLabel('Connection child path', { exact: true }).selectOption('path-two')
  await page.getByLabel('Connection copy', { exact: true }).selectOption('A')
  await page.getByRole('button', { name: 'Add connection', exact: true }).click()
  const exported = (await readExport(page)).data
  expect(exported.transitions[0].from).toBe('path-one')
  expect(exported.transitions[0].to).toBe('path-two')
  expect(exported.transitions.at(-1).from).toBe('path-two')
  expect(exported.transitions.at(-1).to).toBe('path-one')
})

test('an imported PDA supports user-built ABC setup and BAC repetition, with the checked proof preserved in replay', async ({ page }) => {
  const model: PathMazeDefinition = { ...tiny, type: 'infiniteRule', allowedRule: 'infiniteHop', copies: ['A', 'B', 'C'],
    paths: ['1', '2'].map(id => ({ id, label: id, color: '#3374a4', helper: false })),
    start: { path: '1', address: [] }, goal: { path: '2', address: [] } }
  model.connections = connectionsFromText(model, model.copies.flatMap(copy => [`1 <-> ${copy}.1`, `2 <-> ${copy}.2`]).join('\n'), 'Proof walkthrough')
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({ name: 'abc-bac.pda.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exportPathPDA(model, 'ABC setup and BAC repetition'))) })
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  const id = new URL(page.url()).pathname.split('/play/')[1]
  await page.goto(`workbench/${id}?tab=proof`)
  await expect(page.getByText('No saved proofs yet.', { exact: true })).toBeVisible()
  await page.getByLabel('Build setup trails before the repeating part').check()
  await page.getByText('Advanced · copy addresses and shared starting copy', { exact: true }).click()
  await page.getByLabel('Claim scope').fill('ABC')
  await page.getByLabel('Repeating word').fill('BAC')
  for (const [index, path] of ['1', '2'].entries()) {
    const witness = page.locator('.witness').nth(index)
    for (const copy of ['A', 'B', 'C']) await witness.locator('.witness-setup')
      .getByRole('button', { name: `enter ${copy} → ${path}`, exact: true }).click()
    for (const copy of ['B', 'A', 'C']) await witness.locator(':scope > .witness-choices')
      .getByRole('button', { name: `enter ${copy} → ${path}`, exact: true }).click()
  }
  await expect(page.getByRole('region', { name: 'Infinite trail comparison' })).toContainText('Both repeating witnesses reach their targets')
  const left = page.locator('.witness').nth(0)
  await left.locator('.witness-setup').getByRole('button', { name: 'Undo witness step', exact: true }).click()
  await expect(left.locator(':scope > .witness-current')).toContainText('AB · 1')
  await expect(page.locator('.witness').nth(1).locator(':scope > .witness-current')).toContainText('ABCBAC · 2')
  await left.locator('.witness-setup').getByRole('button', { name: 'enter C → 1', exact: true }).click()
  for (const copy of ['B', 'A', 'C']) await left.locator(':scope > .witness-choices')
    .getByRole('button', { name: `enter ${copy} → 1`, exact: true }).click()
  await expect(page.getByRole('region', { name: 'Infinite trail comparison' })).toContainText('Both repeating witnesses reach their targets')
  await page.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await page.getByRole('button', { name: 'Save checked claim', exact: true }).click()
  await page.getByLabel('Proof rule').selectOption('connection')
  await page.getByRole('button', { name: 'Use checked claim 1', exact: true }).click()
  await page.getByRole('button', { name: 'Check my proof', exact: true }).click()
  await page.getByRole('button', { name: 'Save & play proof solution', exact: true }).click()
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.locator('.replay-proof')).toContainText('B → A → C')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const replay = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  const claim = replay.maze.definition.claims.find((claim: { rule: string }) => claim.rule === 'infiniteHop')
  expect(claim.scope).toEqual(['A', 'B', 'C'])
  expect(claim.period).toEqual(['B', 'A', 'C'])
  expect(claim.setup.first).toHaveLength(3)
  expect(claim.setup.second).toHaveLength(3)
  expect(replay.status).toBe('complete')
})
