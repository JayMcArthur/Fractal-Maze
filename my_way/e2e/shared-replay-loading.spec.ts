import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'
import type { BundledReplay } from '../src/app/library/bundledReplays'

const index = JSON.parse(readFileSync('src/data/manifests/shared-replays.json', 'utf8')) as BundledReplay[]

const alice = index.find(bundle => bundle.mazeId === 'alice-in-wonderland')!

test('lists all shared solutions without recordings, then fetches only the selected snapshot', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).pathname.includes('/solutions/')) requests.push(request.url())
  })
  await page.goto('play/alice-in-wonderland', { waitUntil: 'networkidle' })
  const select = page.getByLabel('Maze replay', { exact: true })
  const options = select.locator('optgroup[label="Shared solutions"] option')
  await expect(options).toHaveCount(2)
  expect(requests).toEqual([])
  await select.selectOption(alice.id)
  await expect(page.getByLabel('Replay position')).toHaveAttribute('max', String(alice.moves))
  expect(new Set(requests).size).toBe(1)
  const selectedRequestCount = requests.length
  expect(new URL(requests[0]).pathname).toContain(alice.asset)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByLabel('Replay position')).toHaveValue(String(alice.moves))
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay', exact: true }).click()
  const file = (await (await downloading).path())!
  expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(JSON.parse(readFileSync(`public/${alice.asset}`, 'utf8')))
  await page.getByRole('button', { name: 'Return to play', exact: true }).click()
  await expect(select).toHaveValue('')
  await page.getByLabel('Import replay', { exact: true }).setInputFiles(file)
  await expect(page.getByLabel('Replay position')).toHaveValue('0')
  expect(requests).toHaveLength(selectedRequestCount)
})

for (const failure of ['missing', 'wrong-maze']) {
  test(`a ${failure} shared snapshot reports an error and leaves live Play accessible`, async ({ page }) => {
    await page.route(`**/${alice.asset}`, route => failure === 'missing'
      ? route.fulfill({ status: 404, body: 'Missing recording' })
      : route.fulfill({ contentType: 'application/json', body: readFileSync(`public/${index.find(bundle => bundle.mazeId === 'sierpinski')!.asset}`, 'utf8') }))
    await page.goto(`play/alice-in-wonderland?replay=${alice.id}`)
    await expect(page.getByText(failure === 'missing'
      ? 'Could not load this shared solution.'
      : 'Shared solution does not match its listing.', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Return to play', exact: true }).click()
    await expect(page.getByLabel('Maze replay', { exact: true })).toHaveValue('')
    await expect(page.getByRole('button', { name: 'Move east', exact: true })).toBeVisible()
  })
}

test('wire solutions load on selection and a late previous fetch cannot replace the chosen one', async ({ page }) => {
  const wire = index.filter(bundle => bundle.mazeId === 'wolf-wire-original')
  let release!: () => void
  const delayed = new Promise<void>(resolve => { release = resolve })
  await page.route(`**/${wire[0].asset}`, async route => {
    await delayed
    await route.fulfill({ contentType: 'application/json', body: readFileSync(`public/${wire[0].asset}`, 'utf8') })
  })
  await page.goto('play/wolf-wire-original')
  const select = page.getByLabel('Maze replay', { exact: true })
  await expect(select.locator('option[value^="bundled-wire-"]')).toHaveCount(wire.length)
  const firstStarted = page.waitForRequest(`**/${wire[0].asset}`)
  await select.selectOption(wire[0].id)
  await firstStarted
  await select.selectOption(wire[1].id)
  const slider = page.getByLabel('Replay position')
  await expect(slider).toHaveAttribute('max', String(wire[1].moves))
  await expect(select).toHaveValue(wire[1].id)
  const response = page.waitForResponse(`**/${wire[0].asset}`)
  release()
  await response
  await expect(slider).toHaveAttribute('max', String(wire[1].moves))
  await expect(select).toHaveValue(wire[1].id)
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
})
