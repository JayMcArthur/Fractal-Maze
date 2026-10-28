import { test, expect } from './fixtures'

for (const width of [390, 1440]) {
  test(`hop checking reports missing trails and keeps a valid connection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('play/simple-infinite-hop')
    await page.getByRole('button', { name: 'Open proof notebook', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Proof notebook', exact: true })
    const check = dialog.getByRole('button', { name: 'Check my proof', exact: true })
    await expect(dialog.locator('option[value="finite"], option[value="connection"]')).toHaveCount(
      0
    )
    await expect(check).toBeVisible()
    const order = await dialog.evaluate(
      (el) =>
        !!(
          el
            .querySelector('.witness-grid')!
            .compareDocumentPosition(el.querySelector('.proof-check')!) &
          Node.DOCUMENT_POSITION_FOLLOWING
        )
    )
    expect(order).toBe(true)
    await check.click()
    await expect(dialog.locator('.proof-check [role=status]')).toContainText('Left trail')
    for (const name of ['Left trail', 'Right trail']) {
      const board = dialog.getByRole('region', { name, exact: true })
      await board.getByRole('button', { name: 'Move south', exact: true }).click()
      await board.getByRole('button', { name: 'Move south', exact: true }).click()
      await board.getByRole('button', { name: /^Enter A to path / }).click()
    }
    await check.click()
    await expect(dialog.locator('.proof-check .proof-valid')).toContainText('saved')
    await expect(
      dialog.getByRole('button', { name: 'Save checked claim', exact: true })
    ).toHaveCount(0)
    await dialog.getByRole('button', { name: 'Return to maze', exact: true }).click()
    await page.getByRole('button', { name: 'Follow → Line 2', exact: true }).click()
    await expect(page.locator('.path-controls [role=status]')).toHaveText('Finish reached.')
  })
}
