import { expect, test } from './fixtures'

test('register mazes default to legal next connections and replays use the same readable view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('play/repeated-atomic-cp3-3')
  const drawing = page.getByRole('img', { name: 'Directed repeated blocks around the current terminal' })
  const fullMap = page.getByLabel('Show full connection map', { exact: true })
  await expect(fullMap).not.toBeChecked()
  await expect(drawing).toContainText('available connections')
  await expect(drawing.locator('.repeated-copy-label')).toContainText(['(0, 0)'])
  expect(await drawing.evaluate(svg => (svg as SVGSVGElement).viewBox.baseVal.width)).toBeLessThan(2)
  await fullMap.check()
  await expect(drawing).toContainText('all connections')
  await fullMap.uncheck()
  await page.getByRole('button', { name: 'Go to (0, 0, N18)', exact: true }).click()
  await expect(page.locator('p.format-status')).toContainText('At (0, 0, N18) · step 1')
  await expect(drawing).toContainText('0,0,N18 · available connections')
  const boundaryPoint = await drawing.locator('.repeated-player').evaluate(dot =>
    [dot.getAttribute('cx'), dot.getAttribute('cy')])
  await page.getByRole('button', { name: 'Go to (0, 1, S18)', exact: true }).click()
  await expect(page.locator('p.format-status')).toContainText('At (0, 1, S18) · step 2')
  expect(await drawing.locator('.repeated-player').evaluate(dot =>
    [dot.getAttribute('cx'), dot.getAttribute('cy')])).toEqual(boundaryPoint)
  await expect(drawing.locator('.repeated-current-copy')).toHaveAttribute('y', '0')
  await expect(drawing).toContainText('(0, 1)')
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await expect(page.getByLabel('Replay position')).toHaveAttribute('max', '2')
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(drawing).toContainText('0,1,S18 · available connections')
  await expect(drawing.locator('.repeated-current-copy')).toHaveAttribute('y', '0')
  await page.getByRole('button', { name: 'Step back', exact: true }).click()
  await expect(drawing).toContainText('0,0,N18 · available connections')
  await expect(drawing.locator('.repeated-current-copy')).toHaveAttribute('y', '-1')
  await page.goto('play/repeated-directed-example?replay=bundled-repeated-directed-example')
  await expect(drawing).toContainText('available connections')
  await page.getByRole('button', { name: 'Seek to end', exact: true }).click()
  await expect(page.getByLabel('Replay position')).toHaveValue('13')
  await expect(drawing).toContainText('0,1,E1 · available connections')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const width of [390, 1440]) test(`shared-terminal and internal-terminal replays remain visible at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  for (const id of ['repeated-directed-example', 'repeated-atomic-cp2-3']) {
    await page.goto(`play/${id}?replay=bundled-${id}`)
    const drawing = page.getByRole('img', { name: 'Directed repeated blocks around the current terminal' })
    const slider = page.getByLabel('Replay position')
    await expect(slider).toHaveValue('0')
    const count = Number(await slider.getAttribute('max'))
    for (let step = 0; step <= count; step++) {
      await slider.fill(String(step))
      await expect(page.locator('.replay-timeline')).toContainText(`Step ${step} of ${count}`)
      await expect.poll(() => drawing.evaluate(svg => {
        const box = svg.getBoundingClientRect()
        const dot = svg.querySelector('.repeated-player')!.getBoundingClientRect()
        const edges = svg.querySelector<SVGGraphicsElement>('.repeated-connections')!
        const bounds = edges.getBBox(), matrix = edges.getScreenCTM()!
        const a = new DOMPoint(bounds.x, bounds.y).matrixTransform(matrix)
        const b = new DOMPoint(bounds.x + bounds.width, bounds.y + bounds.height).matrixTransform(matrix)
        const player = [(dot.x + dot.width / 2 - box.x) / box.width, (dot.y + dot.height / 2 - box.y) / box.height]
        return {
          playerVisible: player.every(fraction => fraction > .10 && fraction < .90),
          edgesVisible: !edges.getAttribute('d') || Math.min(a.x, b.x) >= box.left && Math.max(a.x, b.x) <= box.right &&
            Math.min(a.y, b.y) >= box.top && Math.max(a.y, b.y) <= box.bottom,
          labelsVisible: svg.querySelectorAll('.repeated-copy-label').length > 0,
        }
      }), { message: `${id} step ${step}` }).toEqual({ playerVisible: true, edgesVisible: true, labelsVisible: true })
    }
  }
  expect(errors).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
