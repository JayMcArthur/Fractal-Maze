import { expect, test } from './fixtures'
import { readFileSync, statSync } from 'node:fs'
import type { BundledReplay } from '../src/app/library/bundledReplays'

const index = JSON.parse(readFileSync('src/data/manifests/shared-replays.json', 'utf8')) as BundledReplay[]
for (const suffix of ['cp3-3', 'cp-n3-godel']) {
  test(`the recovered ${suffix} solution plays, seeks, pauses and round-trips beneath its maze`, async ({ page }) => {
    const bundle = index.find(row => row.mazeId === `repeated-atomic-${suffix}`)!
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const requested: string[] = []
    page.on('request', request => {
      if (new URL(request.url()).pathname.includes('/solutions/')) requested.push(request.url())
    })
    await page.goto(`play/${bundle.mazeId}`)
    const select = page.getByLabel('Maze replay', { exact: true })
    await expect(select.locator(`option[value="${bundle.id}"]`)).toHaveText(`Solution · ${bundle.moves} moves`)
    expect(requested).toEqual([])
    await select.selectOption(bundle.id)
    const slider = page.getByLabel('Replay position')
    const drawing = page.getByRole('img', { name: 'Directed repeated blocks around the current terminal' })
    await expect(slider).toHaveAttribute('max', String(bundle.moves))
    await expect(drawing).toContainText('0,0,W0')
    await page.getByRole('button', { name: 'Play replay', exact: true }).click()
    await expect(slider).not.toHaveValue('0')
    await page.getByRole('button', { name: 'Pause replay', exact: true }).click()
    const paused = await slider.inputValue()
    await page.waitForTimeout(750)
    await expect(slider).toHaveValue(paused)
    await slider.fill('600000')
    await expect(slider).toHaveValue('600000')
    await expect(drawing.locator('.repeated-player')).toBeVisible()
    await page.getByRole('button', { name: 'Step back', exact: true }).click()
    await expect(slider).toHaveValue('599999')
    await page.getByRole('button', { name: 'Step forward', exact: true }).click()
    await expect(slider).toHaveValue('600000')
    await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
    await expect(drawing).toContainText('0,0,W1')
    await expect(slider).toHaveValue(String(bundle.moves))
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export replay', exact: true }).click()
    const path = (await (await download).path())!
    expect(statSync(path).size).toBeLessThan(300000)
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(JSON.parse(readFileSync(`public/${bundle.asset}`, 'utf8')))
    await page.getByRole('button', { name: 'Return to play', exact: true }).click()
    await expect(select).toHaveValue('')
    await page.getByLabel('Import replay', { exact: true }).setInputFiles(path)
    await expect(slider).toHaveValue('0')
    await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
    await expect(drawing).toContainText('0,0,W1')
    expect(new Set(requested).size).toBe(1)
    expect(errors).toEqual([])
  })
}
