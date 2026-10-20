import type { Page } from '@playwright/test'

/** Certificate-editor workflows explicitly opt into the advanced text controls. */
export async function openProofDetails(page: Page) {
  await page.locator('.proof-workbench').waitFor()
  for (const details of await page.locator('.proof-advanced, .witness-text-steps').all()) {
    if ((await details.getAttribute('open')) === null)
      await details.locator(':scope > summary').click()
  }
}
