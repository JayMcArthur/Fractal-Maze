import { openProofDetails } from './proofControls'
import { expect, test } from './fixtures'

test('a manually checked infinite connection is usable in live Play', async ({ page }) => {
  await page.goto('workbench/simple-infinite-hop?tab=proof')
  for (let index = 0; index < 2; index++) {
    await openProofDetails(page)
    await page.getByLabel('Repeating word', { exact: true }).fill('A')
    const witnesses = page.locator('section.witness')
    await witnesses.nth(0).getByRole('button', { name: 'enter A → 1', exact: true }).click()
    await witnesses.nth(1).getByRole('button', { name: 'enter A → 2', exact: true }).click()
    await page.getByRole('button', { name: 'Check my proof', exact: true }).click()
  }
  await expect(page.getByRole('heading', { name: 'Saved claims (2)' })).toBeVisible()
  await page.getByRole('tab', { name: 'Play preview', exact: true }).click()
  const connection = page.getByRole('button', { name: 'Use proof → path 2', exact: true })
  await expect(connection).toHaveCount(1)
  await connection.click()
  await expect(page.locator('.path-controls [role=status]')).toHaveText('Finish reached.')
  await page.getByRole('button', { name: 'Undo move', exact: true }).click()
  await expect(
    page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })
  ).toContainText('1')
})
