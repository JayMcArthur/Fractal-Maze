import { test, expect } from './fixtures'
import { readFileSync } from 'node:fs'
import type { ReplayDocument } from '../src/core/replay/ReplayDocument'

test('Alice can switch from the default block display to its original pixels', async ({ page }) => {
  await page.goto('play/draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png')
  await expect(page.getByLabel('Display style')).toHaveValue('corridors')
  await page.getByLabel('Display style').selectOption('source')
  const drawing = page.getByRole('img', { name: 'Playable source maze routes' })
  await expect(drawing.locator('image')).toHaveAttribute('width', '1452')
  await expect(drawing.locator('image')).toHaveAttribute('height', '1452')
  await expect(page.getByTestId('source-player-marker')).toHaveAttribute('cx', '266')
  await drawing.getByRole('button', { name: 'Enter A to path 7', exact: true }).click()
  await expect(page.locator('.digital-hud__position')).toContainText('A')
  await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })).toContainText('7')
  await expect(drawing.getByRole('button', { name: 'Exit A to path 5', exact: true })).toBeVisible()
  await drawing.getByRole('button', { name: 'Exit A to path 5', exact: true }).click()
  await expect(page.locator('.digital-hud__position')).toContainText('Surface')
  await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })).toContainText('5')
  await expect(page.getByLabel('Display style')).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Save & play replay' })).toBeEnabled()
  await expect(page.getByTestId('source-player-marker')).toHaveAttribute('cx', '514')
  const selector = page.getByLabel('Maze view', { exact: true })
  await expect(selector.locator('option')).toHaveText(['Source drawing', 'Block remake'])
  await selector.selectOption('alice-in-wonderland')
  await expect(page).toHaveURL(/\/play\/alice-in-wonderland$/)
})

test('Alice shared source solution visibly follows the image to a surface exit', async ({ page }) => {
  await page.goto('replay/bundled-draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png')
  await page.getByRole('button', { name: 'Play replay' }).click()
  await expect(page.locator('.replay-timeline')).not.toContainText('Step 0 of')
  await page.getByRole('button', { name: 'Seek to end' }).click()
  const exits = [[373, 104], [726, 104], [1081, 104], [1348, 373], [1348, 726], [1348, 1081],
    [1081, 1348], [726, 1348], [373, 1348], [104, 1081], [104, 726], [104, 373]]
  await expect.poll(async () => {
    const marker = page.getByTestId('source-player-marker')
    const point = [Number(await marker.getAttribute('cx')), Number(await marker.getAttribute('cy'))]
    return exits.some(([x, y]) => Math.hypot(point[0] - x, point[1] - y) < 0.01)
  }).toBe(true)
  await expect(page.locator('.format-status')).toContainText('surface')
})

test('an older saved Alice source drawing uses its native pixels while preserving its document', async ({ page }) => {
  await page.goto('play/draft-maze-images-mike-earnest-alice-and-the-hedge-maze-png')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const old = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  old.metadata.id = 'old-alice-source'
  old.artwork.width = 1200
  old.artwork.height = 1200
  old.artwork.bounds = [80, 80, 1292, 1292]
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({ name: 'old-alice.fmaze', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(old)) })
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  await expect(page).toHaveURL(/\/play\/old-alice-source$/)
  await page.getByLabel('Display style').selectOption('source')
  const drawing = page.getByRole('img', { name: 'Playable source maze routes' })
  await expect(drawing.locator('image')).toHaveAttribute('width', '1452')
  await expect(drawing).toHaveAttribute('viewBox', '0 0 1452 1452')
  await drawing.getByRole('button', { name: 'Enter A to path 7', exact: true }).click()
  await expect(page.locator('.digital-hud__position')).toContainText('A')
  await expect(page.locator('.digital-hud__metrics > div').filter({ hasText: 'Path' })).toContainText('7')
  const exported = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  const saved = JSON.parse(readFileSync((await (await exported).path())!, 'utf8'))
  expect(saved.artwork).toEqual(old.artwork)
  expect(saved.definition).toEqual(old.definition)
})

test('source undo restores the position before a copy excursion and records the next crossing', async ({ page }) => {
  await page.goto('play/draft-maze-images-siggy-skeptic-play-1-svg')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Trace / PDA' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Enter B → path 3', exact: true }).click()
  await page.getByRole('button', { name: 'Exit B → path 1', exact: true }).click()
  await expect(page.getByLabel('Display style')).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Save & play replay' })).toBeEnabled()
  await page.getByRole('button', { name: 'Undo move', exact: true }).click()
  await page.getByRole('button', { name: 'Undo move', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Save & play replay' })).toBeDisabled()
  await page.getByRole('button', { name: 'Enter A → path 2', exact: true }).click()
  await page.getByRole('button', { name: 'Save & play replay' }).click()
  await expect(page.locator('.replay-timeline')).toContainText('Step 0 of 1')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay' }).click()
  const replay = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(replay.nativeRoute.states).toEqual([
    { path: '1', address: [] }, { path: '2', address: ['A'] },
  ])
  expect(replay.nativeRoute.edges).toHaveLength(1)
})

test('optional bundled solutions play visibly and reach the drawn SVG finish', async ({ page }) => {
  await page.goto('play/wolf-wire-original')
  await expect(page.getByLabel('Maze replay', { exact: true }).locator('option').filter({ hasText: 'Wolf wire maze' })).toHaveCount(11)
  await page.goto('play/backlot')
  await expect(page.getByLabel('Maze replay', { exact: true }).locator('option').filter({ hasText: 'Solution' })).not.toHaveCount(0)
  await page.goto('play/koteitan-block')
  await expect(page.getByLabel('Maze replay', { exact: true }).locator('option').filter({ hasText: 'Solution' })).not.toHaveCount(0)
  await page.goto('play/draft-maze-images-siggy-skeptic-play-1-svg')
  await page.getByLabel('Maze replay', { exact: true }).selectOption('bundled-draft-maze-images-siggy-skeptic-play-1-svg')
  await page.getByRole('button', { name: 'Play replay' }).click()
  await expect(page.locator('.replay-timeline')).not.toContainText('Step 0 of')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await page.getByRole('button', { name: 'Seek to end' }).click()
  await expect(page.getByRole('button', { name: 'Play replay' })).toBeVisible()
  await expect.poll(async () => Number(await page.getByTestId('source-player-marker').getAttribute('cy')))
    .toBeCloseTo(16.7776, 2)
})

test('old replay cards and playback use the same cleaned route and recover their maze', async ({ page }) => {
  await page.goto('play/draft-maze-images-siggy-skeptic-play-1-svg')
  await page.getByRole('button', { name: 'Enter A → path 2', exact: true }).click()
  await page.getByRole('button', { name: 'Save & play replay' }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay' }).click()
  const replay = JSON.parse(readFileSync((await (await downloaded).path())!, 'utf8')) as ReplayDocument
  await page.evaluate(async (doc) => {
    const { maze, ...older } = doc
    const record = { id: 'older-detour', mazeId: doc.mazeRef, mazeTitle: 'An older detour',
      createdAt: doc.startedAt, doc: { ...older, metrics: { ...older.metrics, totalMoves: 3 }, nativeRoute: {
        type: 'pathPushdown', states: [
          { path: '1', address: [] }, { path: '3', address: ['B'] },
          { path: '1', address: [] }, { path: '2', address: ['A'] },
        ], edges: ['edge-1-in', 'edge-1-out', 'edge-0-in'],
      } } }
    void maze
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('fractal-maze', 3)
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('replays', 'readwrite')
        tx.objectStore('replays').put(record)
        tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => reject(tx.error)
      }
    })
  }, replay)
  await page.goto('play/draft-maze-images-siggy-skeptic-play-1-svg')
  await expect(page.getByLabel('Maze replay', { exact: true }).locator('option[value="older-detour"]')).toContainText('1 moves')
  await page.getByLabel('Maze replay', { exact: true }).selectOption('older-detour')
  await expect(page.locator('.replay-timeline')).toContainText('Step 0 of 1')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await page.getByRole('button', { name: 'Play replay' }).click()
  await expect(page.locator('.replay-timeline')).toContainText('Step 1 of 1')
})

test('a current catalog copy keeps the earlier saved draft intact', async ({ page }) => {
  await page.goto('play/draft-maze-images-siggy-skeptic-play-1-svg')
  await page.getByRole('button', { name: 'Enter A → path 2', exact: true }).click()
  await page.getByRole('button', { name: 'Save & play replay' }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay' }).click()
  const replay = JSON.parse(readFileSync((await (await downloaded).path())!, 'utf8')) as ReplayDocument
  await page.evaluate(async (doc) => {
    const maze = doc.maze
    maze.metadata.title = 'My earlier source draft'
    if (maze.definition.type !== 'pathPushdown') throw new Error('Wrong maze')
    maze.definition.start = null; maze.definition.goal = null; maze.definition.connections = []
    maze.artwork!.traces = []; maze.artwork!.gates = []
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('fractal-maze', 3)
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('projects', 'readwrite')
        tx.objectStore('projects').put({ id: maze.metadata.id, title: maze.metadata.title, doc: maze,
          createdAt: maze.metadata.createdAt, updatedAt: maze.metadata.updatedAt })
        tx.oncomplete = () => { db.close(); resolve() }; tx.onerror = () => reject(tx.error)
      }
    })
  }, replay)
  await page.goto('library')
  const card = page.locator('.library-card').filter({ hasText: 'My earlier source draft' })
  await card.getByRole('button', { name: 'Copy current catalog maze' }).click()
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await expect(page).not.toHaveURL(/play\/draft-maze-images-siggy-skeptic-play-1-svg$/)
  await page.goto('library')
  await expect(page.getByRole('heading', { name: 'My earlier source draft', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Skeptic Play 1 — source SVG — catalog copy', exact: true })).toBeVisible()
})

test('alternate drawings share one Library card and room views follow the current path', async ({ page }) => {
  await page.goto('library')
  const family = page.locator('.library-card').filter({ has: page.getByRole('heading', { name: 'Skeptic Play 1', exact: true }) })
  await expect(family).toHaveCount(1)
  await family.getByLabel('Maze view', { exact: true }).selectOption('square')
  await expect(page.locator('.player-title')).toContainText('Square')
  await page.getByLabel('Maze view', { exact: true }).selectOption('draft-maze-images-siggy-skeptic-play-1-svg')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await page.goto('play/draft-maze-images-the-inner-frame-pdf')
  await page.getByLabel('Display style').selectOption('source')
  const artwork = page.getByRole('img', { name: 'Playable source maze routes' })
  await expect(artwork).toHaveAttribute('viewBox', '178.5 239 84 79')
  await page.getByRole('button', { name: 'Enter A → path Y · left', exact: true }).click()
  await expect(artwork).toHaveAttribute('viewBox', '446 239 84 79')
})

test('new atomic repeated mazes solve, play and export their own terminal states', async ({ page }) => {
  await page.goto('play/repeated-atomic-cp2-3')
  await expect(page.getByRole('status').first()).toContainText('(0, 0, W0)')
  await page.getByRole('button', { name: 'Find shortest route', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Shortest route found' })).toContainText('59')
  await page.getByRole('button', { name: 'Save & play replay' }).click()
  await expect(page.locator('.replay-timeline')).toContainText('Step 0 of 59')
  await page.getByRole('button', { name: 'Seek to end' }).click()
  await expect(page.locator('.replay-timeline')).toContainText('Step 59 of 59')
})

test('Build opens a fresh image workspace and source references lead to their bound player', async ({ page }) => {
  await page.goto('build')
  await page.getByRole('link', { name: 'Start a conversion' }).click()
  await expect(page.getByRole('heading', { name: 'Untitled image maze' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Maze name', exact: true }).fill('My new source maze')
  await expect(page.getByRole('heading', { name: 'My new source maze' })).toBeVisible()
  await expect(page.getByLabel('Upload source artwork')).toBeAttached()
  await page.getByRole('button', { name: 'Save workbench', exact: true }).click()
  await expect(page).not.toHaveURL(/workbench\/new/)
  await expect(page.getByRole('button', { name: 'Undo edit', exact: true })).toBeEnabled()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'My new source maze' })).toBeVisible()
  await page.goto('')
  await page.getByText('Images, PDAs and infinite proofs', { exact: true }).click()
  await page.getByRole('link', { name: 'Source artwork', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Reference artwork' })).toBeVisible()
  await page.goto('reference/maze-images-jay-mcarthur-a-long-path-v6-png')
  await page.getByRole('link', { name: 'Play this maze' }).click()
  await expect(page.getByRole('combobox', { name: 'Maze view' })).toHaveValue('draft-maze-images-jay-mcarthur-a-long-path-v6-png')
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  await page.locator('.workbench-notes summary').click()
  await expect(page.getByText('The compressed black center', { exact: false })).toBeVisible()
})

test('refreshed source editor loads maze rules instead of the app HTML', async ({ page }) => {
  await page.goto('programs/repeated-maze/index.html')
  const rules = page.locator('textarea').first()
  await expect(rules).toHaveValue(/normal:/)
  await expect(rules).not.toHaveValue(/doctype/i)
  await page.getByRole('button', { name: 'Draw Maze', exact: true }).click()
  await expect(page.locator('#canvas')).toBeVisible()
})

test('unfinished source drafts open conversion review from cards, alternate views and saved projects', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const base = 'draft-maze-images-martin-windischer-'
  await page.goto('library')
  const wind = page.locator('.library-card').filter({ has: page.getByRole('heading', { name: 'Windischer spiral', exact: true }) })
  await expect(wind.getByRole('link', { name: 'Play', exact: true })).toHaveCount(0)
  await wind.locator('.library-card__actions').getByRole('link', { name: 'Review conversion', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`workbench/${base}windischer-png$`))
  await page.locator('.workbench-notes summary').click()
  await expect(page.getByRole('textbox', { name: 'Review notes' })).toHaveValue(/Layer-boundary annotations/)
  await page.goto('library')
  await wind.getByLabel('Maze view', { exact: true }).selectOption(`${base}windischer-gif`)
  await expect(page).toHaveURL(new RegExp(`workbench/${base}windischer-gif$`))
  await page.goto(`play/${base}windischer-recursion-jpg`)
  await expect(page).toHaveURL(new RegExp(`workbench/${base}windischer-recursion-jpg$`))

  await page.goto('workbench/new')
  await page.getByRole('textbox', { name: 'Maze name', exact: true }).fill('Unfinished wire drawing')
  await page.getByRole('button', { name: 'Save workbench', exact: true }).click()
  await expect(page).not.toHaveURL(/workbench\/new$/)
  await page.goto('library')
  const saved = page.locator('.library-card').filter({ has: page.getByRole('heading', { name: 'Unfinished wire drawing', exact: true }) })
  await expect(saved.getByRole('link', { name: 'Play', exact: true })).toHaveCount(0)
  await saved.locator('.library-card__preview').click()
  await expect(page.getByRole('heading', { name: 'Unfinished wire drawing', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/workbench\//)

  await page.goto('library')
  const ready = page.locator('.library-card').filter({ has: page.getByRole('heading', { name: 'Skeptic Play 1', exact: true }) })
  await ready.getByRole('link', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('source-player-marker')).toBeVisible()
  expect(errors).toEqual([])
})
