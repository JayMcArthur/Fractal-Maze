import { expect, test } from './fixtures'
import type { Page } from '@playwright/test'

async function waitForZoom(page: Page) {
  const player = page.locator('.path-player .source-route-player')
  for (let i = 0; i < 220; i++) {
    await page.clock.runFor(16)
    if (await player.getAttribute('data-copy-transition')) return player
  }
  throw new Error('Copy transition did not animate')
}

for (const reduced of [false, true]) {
  test(`copy camera preserves the dot, replay pause and seek (reduced motion ${reduced})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
    await page.clock.install({ time: new Date('2026-10-28T12:00:00Z') })
    await page.goto('play/simple-infinite-hop')
    await page.clock.pauseAt(new Date('2026-10-28T12:01:00Z'))
    const marker = page.locator('.path-player').getByTestId('source-player-marker')
    const radius = (await marker.boundingBox())!.width
    const enter = page.getByRole('button', { name: 'Enter A → path 1', exact: true })
    await enter.click()
    if (!reduced) {
      const player = await waitForZoom(page)
      await page.clock.runFor(100)
      await expect(player).toHaveAttribute('data-copy-transition', 'A')
      expect((await marker.boundingBox())!.width).toBeCloseTo(radius, 1)
      await page.screenshot({ path: test.info().outputPath('copy-zoom.png') })
    }
    await page.clock.runFor(5000)
    await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled()
    await expect(page.locator('[data-copy-transition]')).toHaveCount(0)
    await expect(page.locator('.digital-hud__metrics')).toContainText('Depth1')
    // Exiting reverses the camera mapping while preserving the stack and dot size.
    await page.getByRole('button', { name: 'Exit A → path 1', exact: true }).click()
    if (!reduced) {
      const player = await waitForZoom(page)
      await page.clock.runFor(100)
      await expect(player).toHaveAttribute('data-copy-transition', 'A')
      expect((await marker.boundingBox())!.width).toBeCloseTo(radius, 1)
    }
    await page.clock.runFor(5000)
    await expect(page.locator('.digital-hud__metrics')).toContainText('Depth0')
    await page.getByRole('button', { name: 'Undo move', exact: true }).click()
    await page.clock.runFor(32)
    await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
    await page.getByRole('button', { name: 'Play replay', exact: true }).click()
    if (!reduced) {
      for (let i = 0; i < 260; i++) {
        await page.clock.runFor(16)
        if (await page.locator('[data-copy-transition]').count()) break
      }
      await expect(page.locator('[data-copy-transition]')).toHaveCount(1)
      await page.getByRole('button', { name: 'Pause replay', exact: true }).click()
      const svg = page.locator('.source-artwork')
      const camera = await svg.getAttribute('viewBox')
      await page.clock.runFor(1000)
      await expect(svg).toHaveAttribute('viewBox', camera!)
      await page.getByRole('button', { name: 'Seek to start', exact: true }).click()
      await page.clock.runFor(32)
      await expect(page.locator('[data-copy-transition]')).toHaveCount(0)
      await expect(page.getByLabel('Replay position', { exact: true })).toHaveValue('0')
    } else {
      await page.clock.runFor(5000)
      await expect(page.locator('[data-copy-transition]')).toHaveCount(0)
    }
  })
}
