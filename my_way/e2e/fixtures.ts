import { test as base, expect } from '@playwright/test'

// These workflows deliberately leave their runs. Guard behavior has its own dialog tests.
export const test = base.extend({
  page: async ({ page }, runWorkflow) => {
    page.on('dialog', (dialog) => {
      void dialog.accept()
    })
    await runWorkflow(page)
  },
})
export { expect }
