import { expect, test } from './fixtures'
import { readFileSync } from 'node:fs'

const assets: { id: string; asset: string }[] = JSON.parse(readFileSync('src/data/manifests/maze-assets.json', 'utf8'))

test('Play and Solve request only their selected maze without downloading the authoring catalog', async ({ page }) => {
  const forbidden: string[] = []
  page.on('request', request => {
    if (/\/(catalog-|pathCatalog-|artwork-drafts-)[^/]*\.js/.test(request.url())) forbidden.push(request.url())
  })
  const documents: string[] = []
  page.on('request', request => {
    if (/\/mazes\/[^/]+\.json$/.test(request.url())) documents.push(new URL(request.url()).pathname)
  })
  for (const [id, route] of [
    ['alice-in-wonderland', 'play/alice-in-wonderland'],
    ['draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png', 'play/draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png'],
    ['pda-guide-6', 'solver?id=pda-guide-6'],
  ]) {
    documents.length = 0
    await page.goto(route)
    if (route.startsWith('solver')) await expect(page.getByRole('button', { name: 'Find finite route', exact: true })).toBeVisible()
    else await expect(page.getByLabel('Maze replay', { exact: true })).toBeVisible()
    expect(documents).toEqual(['/Fractal-Maze/' + assets.find(entry => entry.id === id)!.asset])
    expect(forbidden).toEqual([])
  }
})

test('a missing selected maze asset reports a load error and keeps the Library reachable', async ({ page }) => {
  await page.route('**/' + assets.find(entry => entry.id === 'alice-in-wonderland')!.asset, route => route.fulfill({ status: 404, body: 'missing' }))
  await page.goto('play/alice-in-wonderland')
  await expect(page.getByRole('heading', { name: 'Maze not found', exact: true })).toBeVisible()
  await expect(page.getByText('The selected maze could not be loaded.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Open library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Choose your maze.', exact: true })).toBeVisible()
})
