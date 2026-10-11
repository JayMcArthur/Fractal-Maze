import { expect, test } from './fixtures'

test('Library browses original covers and references without loading maze models or renderers', async ({ page }) => {
  const models: string[] = []
  page.on('request', request => {
    if (/\/src\/app\/library\/(?:catalog|pathCatalog)\.ts|\/src\/ui\/components\/MazeCanvas\.tsx|\/src\/data\/mazes\/|\/assets\/(?:catalog-|pathCatalog-|MazeCanvas-)/.test(request.url()))
      models.push(request.url())
  })
  await page.goto('library')
  await expect(page.locator('.library-card')).toHaveCount(49)
  await page.getByPlaceholder('Title, author, or tag').fill('Alice')
  const alice = page.locator('.library-card')
  await expect(alice).toHaveCount(1)
  const image = alice.locator('.library-card__preview > img')
  await expect(image).toHaveAttribute('src', /Alice_and_the_Hedge_Maze\.png$/)
  await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('button', { name: /Reference artwork/ }).click()
  await expect(page.getByRole('region', { name: 'Reference artwork', exact: true })).toBeVisible()
  expect(models).toEqual([])
})
