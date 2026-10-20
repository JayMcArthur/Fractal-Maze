import { test, expect } from './fixtures'
import { readFileSync } from 'node:fs'
import bundles from '../src/data/manifests/shared-replays.json' with { type: 'json' }

const id = 'proof-maze-images-siggy-first-cantor-svg'
const bundle = bundles.find(bundle => bundle.mazeId === id)!
const replay = JSON.parse(readFileSync(`public/${bundle.asset}`, 'utf8'))
const endpoint = replay.nativeRoute.physical.positions.at(-1).point

test('seeking a proof replay jumps to the recorded point and cancels motion immediately', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-10T12:00:00Z') })
  await page.goto(`play/${id}?replay=${bundle.id}`)
  await expect(page.getByRole('button', { name: 'Play replay', exact: true })).toBeVisible()
  await page.clock.pauseAt(new Date('2026-10-10T12:01:00Z'))
  await page.getByRole('button', { name: 'Step forward', exact: true }).click()
  await page.clock.runFor(32)
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await page.clock.runFor(16)
  const marker = page.getByTestId('source-player-marker')
  await expect(marker).toHaveAttribute('cx', String(endpoint[0]))
  await expect(marker).toHaveAttribute('cy', String(endpoint[1]))
  await page.clock.runFor(20000)
  await expect(marker).toHaveAttribute('cx', String(endpoint[0]))
  await expect(marker).toHaveAttribute('cy', String(endpoint[1]))
  await page.getByRole('button', { name: 'Seek to start', exact: true }).click()
  await page.clock.runFor(16)
  const start = replay.nativeRoute.physical.positions[0].point
  await expect(marker).toHaveAttribute('cx', String(start[0]))
  await expect(marker).toHaveAttribute('cy', String(start[1]))
})
