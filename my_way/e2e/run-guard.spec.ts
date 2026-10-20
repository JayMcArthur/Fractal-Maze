import { expect, test } from '@playwright/test'

test('leaving an unfinished square run can be cancelled, then confirmed', async ({ page }) => {
  await page.goto('play/alice-in-wonderland')
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  const first = page.waitForEvent('dialog')
  await page
    .getByRole('link', { name: 'Browse collection', exact: false })
    .click({ noWaitAfter: true })
  const cancelled = await first
  expect(cancelled.message()).toContain('unfinished run')
  await cancelled.dismiss()
  await expect(page).toHaveURL(/play\/alice-in-wonderland$/)
  await expect(page.locator('.digital-hud__metrics').filter({ hasText: 'Moves' })).toContainText(
    '1'
  )
  const second = page.waitForEvent('dialog')
  await page
    .getByRole('link', { name: 'Browse collection', exact: false })
    .click({ noWaitAfter: true })
  await (await second).accept()
  await expect(page).toHaveURL(/library$/)
})

test('source runs warn on view changes but saving a replay leaves safely', async ({ page }) => {
  await page.goto('play/draft-maze-images-siggy-skeptic-play-1-svg')
  await page.getByRole('button', { name: 'Enter A → path 2', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled({
    timeout: 12000,
  })
  const dialog = page.waitForEvent('dialog')
  await page.getByLabel('Play maze', { exact: true }).selectOption('square')
  await (await dialog).dismiss()
  await expect(page).toHaveURL(/siggy-skeptic-play-1-svg$/)
  const unexpected: string[] = []
  page.on('dialog', (dialog) => {
    unexpected.push(dialog.type())
    void dialog.dismiss()
  })
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play replay', exact: true })).toBeVisible()
  expect(unexpected).toEqual([])
  await page.getByRole('link', { name: 'Library', exact: true }).first().click()
  await expect(page).toHaveURL(/library$/)
  expect(unexpected).toEqual([])
})
