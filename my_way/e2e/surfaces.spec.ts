import { test, expect } from './fixtures'
import { readFileSync } from 'node:fs'
const assets = JSON.parse(readFileSync('src/data/manifests/maze-assets.json', 'utf8')) as { id: string; asset: string }[]

for (const width of [390, 1440]) {
  test(`file dialogs keep actions visible and restore focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 })
    await page.goto('library')
    const launch = page.getByRole('button', { name: 'Import maze', exact: true })
    await launch.click()
    const dialog = page.getByRole('dialog', { name: 'Import Maze', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Load Maze', exact: true })).toBeDisabled()
    const choosing = page.waitForEvent('filechooser')
    await dialog.getByLabel('Choose maze file', { exact: true }).press('Enter')
    await (await choosing).setFiles({
      name: 'bad.fmaze', mimeType: 'application/json', buffer: Buffer.from('broken maze'),
    })
    await expect(dialog.getByText(/Unrecognised format/)).toBeVisible()
    const transfer = await page.evaluateHandle(() => {
      const data = new DataTransfer()
      data.items.add(new File(['broken maze'], 'bad.fmaze', { type: 'application/json' }))
      return data
    })
    await dialog.locator('.import-drop').dispatchEvent('dragover', { dataTransfer: transfer })
    await expect(page.getByText('Drop maze file to import', { exact: true })).toHaveCount(1)
    await dialog.locator('.import-drop').dispatchEvent('drop', { dataTransfer: transfer })
    await expect(page.getByText('Drop maze file to import', { exact: true })).toHaveCount(0)
    const source = assets.find(entry => entry.id === 'alice-in-wonderland')!
    await dialog.locator('input[type=file]').setInputFiles({
      name: 'alice.fmaze', mimeType: 'application/json',
      buffer: readFileSync(`public/${source.asset}`),
    })
    await expect(dialog.getByRole('button', { name: 'Load Maze', exact: true })).toBeEnabled()
    await dialog.locator('.app-dialog__body').evaluate(body => { body.scrollTop = body.scrollHeight })
    await expect(dialog.getByRole('button', { name: 'Load Maze', exact: true })).toBeInViewport()
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeInViewport()
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(launch).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('')

    const cover = page.getByRole('button', { name: 'Cover image', exact: true }).first()
    await cover.click()
    const picker = page.getByRole('dialog', { name: /^Cover for / })
    await expect(picker.getByRole('button', { name: 'Save cover', exact: true })).toBeInViewport()
    await picker.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(cover).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test(`finish dialog keeps replay and restart actions at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 })
    await page.goto('library')
    await page.getByRole('button', { name: 'Import maze', exact: true }).click()
    await page.getByRole('dialog').locator('input[type=file]').setInputFiles('e2e/fixtures/surface-win.fmaze')
    await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
    await page.getByRole('button', { name: 'Move east', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Maze escaped.', exact: true })
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Run it again', exact: true })).toBeInViewport()
    await dialog.getByRole('button', { name: 'Run it again', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await page.getByRole('button', { name: 'Move east', exact: true }).click()
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Save replay', exact: true }).click()
    await expect(page).toHaveURL(/replay=/)
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Play replay', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test(`proof display checkbox stays beside its label at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('play/simple-infinite-hop')
    await page.getByRole('button', { name: 'Open proof notebook', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Proof notebook', exact: true })
    const row = dialog.locator('.source-display-style').first()
    await row.scrollIntoViewIfNeeded()
    const aligned = await row.evaluate(label => {
      const box = label.querySelector('input')!.getBoundingClientRect()
      const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!
      const range = document.createRange()
      range.selectNode(text)
      const caption = range.getBoundingClientRect()
      return caption.left >= box.right && Math.abs(caption.top + caption.height / 2 - box.top - box.height / 2) < 8
    })
    expect(aligned).toBe(true)
    await expect(dialog.getByRole('button', { name: 'Return to maze', exact: true })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
