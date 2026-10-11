import { test, expect } from './fixtures'
import { readFileSync } from 'node:fs'
const references: { title: string; asset: string }[] = JSON.parse(
  readFileSync('src/data/manifests/references.json', 'utf8')
)

const cantor = 'proof-maze-images-siggy-simple-cantor-maze-svg'

test('guide PDA inputs play, save and export an immutable path replay', async ({ page }) => {
  await page.goto('solver?id=pda-guide-1')
  await page.getByText('Run a guide input string', { exact: true }).click()
  await page.getByRole('button', { name: 'Load guide example' }).click()
  await page.getByRole('button', { name: 'Run input', exact: true }).click()
  await expect(page.getByRole('status')).toContainText(
    'Guide input accepted; step through its route.'
  )
  await page.getByRole('button', { name: 'Route end', exact: true }).click()
  await expect(page.locator('.path-state-caption')).toContainText('surface · 2')
  await page.getByRole('button', { name: 'Save & play replay' }).click()
  await expect(page.getByLabel('Play maze')).toBeVisible()
  await page.getByRole('button', { name: 'Seek to end' }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText('surface · 2')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay' }).click()
  const replay = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(replay.nativeRoute.edges).toHaveLength(28)
  expect(replay.maze.artwork.traces.length).toBeGreaterThan(0)
  await page.reload()
  await page.getByRole('button', { name: 'Seek to end' }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText('surface · 2')
})

test('the disputed Wolfram guide input keeps its unfinished stack visible in a replay', async ({
  page,
}) => {
  await page.goto('solver?id=pda-guide-2')
  await page.getByText('Run a guide input string', { exact: true }).click()
  await page.getByRole('button', { name: 'Load guide example' }).click()
  await page.getByRole('button', { name: 'Run input', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Input rejected after')
  await page.getByRole('button', { name: 'Route end', exact: true }).click()
  await expect(page.locator('.path-state-caption')).toContainText('AB · 17')
  await page.getByRole('button', { name: 'Save & play replay' }).click()
  await page.getByRole('button', { name: 'Seek to end' }).click()
  await expect(page.locator('.path-replay .format-status')).toHaveText('AB · 17')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export replay' }).click()
  const replay = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(replay.status).toBe('partial')
})

test('draws source-coordinate traces while retaining the original SVG curves and transforms', async ({
  page,
}) => {
  await page.goto('workbench/proof-maze-images-siggy-first-cantor-svg')
  await expect(page.getByRole('heading', { name: 'First Cantor', exact: true })).toBeVisible()
  await page.getByLabel('Trace tool', { exact: true }).selectOption('draw')
  const board = page.locator('svg.trace-board')
  await board.scrollIntoViewIfNeeded()
  for (const point of [
    [28, 20],
    [31, 22],
    [34, 24],
  ]) {
    const screen = await board.evaluate((svg, point) => {
      const transformed = new DOMPoint(point[0], point[1]).matrixTransform(
        (svg as SVGSVGElement).getScreenCTM()!
      )
      return { x: transformed.x, y: transformed.y }
    }, point)
    await page.mouse.click(screen.x, screen.y)
  }
  await page.getByRole('button', { name: 'Finish trace' }).click()
  await page.getByRole('button', { name: 'Save workbench' }).click()
  await expect(page.getByText('Saved to library', { exact: true })).toBeVisible()
  await page.reload()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export workbench' }).click()
  const doc = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(doc.artwork.traces.at(-1).points).toEqual([
    [28, 20],
    [31, 22],
    [34, 24],
  ])
  expect(
    doc.artwork.traces.find((trace: { id: string }) => trace.id === 'path42098').svg.d
  ).toContain('84.08618')
  expect(doc.definition.review).toBe('wip')
})

test('imports SVG curves safely with exact transforms, then keeps them in workbench export', async ({
  page,
}) => {
  await page.goto('workbench/pda-guide-1')
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100"><g transform="translate(10 20)"><path d="M10 10Q30 70 70 10" fill="none" stroke="#406090"/></g></svg>'
  await page
    .getByLabel('Upload source artwork')
    .setInputFiles({ name: 'curve.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) })
  await expect(page.locator('svg.trace-board image')).toHaveAttribute(
    'href',
    /^data:image\/svg\+xml;base64,/
  )
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export workbench' }).click()
  const doc = JSON.parse(readFileSync((await (await download).path())!, 'utf8'))
  expect(doc.artwork.width).toBe(100)
  expect(doc.artwork.traces[0].svg).toEqual({
    d: 'M10 10Q30 70 70 10',
    matrix: [1, 0, 0, 1, 10, 20],
  })
  expect(doc.definition.connections).toHaveLength(18)
})

test('Cantor notebook starts empty and checks only a witness constructed by the player', async ({
  page,
}) => {
  await page.goto(`workbench/${cantor}?tab=proof`)
  await expect(page.getByRole('heading', { name: 'Saved claims (0)' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Use descendant hypothesis', exact: true })
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText(
    'Build the required witness routes'
  )
  for (const move of [
    'enter A → 1',
    'Use descendant hypothesis',
    'exit A → 2',
    'enter B → 1',
    'Use descendant hypothesis',
    'exit B → 3',
  ]) {
    await page.getByRole('button', { name: move, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText(
    'Derivation checked under Cantor-hop rules'
  )
  await page.getByRole('button', { name: 'Save checked claim' }).click()
  await page.getByRole('button', { name: 'Save workbench' }).click()
  await expect(page.getByText('Saved to library', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Saved claims (1)' })).toBeVisible()
  await expect(page.locator('.saved-claim > summary')).toContainText('Checked')
  await page.locator('.saved-claim > summary').click()
  await expect(page.locator('.saved-claim .witness-steps li')).toHaveCount(7)
  await expect(
    page.locator('.saved-claim').getByText('Descendant hypothesis', { exact: true })
  ).toHaveCount(2)
  await page.getByRole('tab', { name: 'Trace & PDA' }).click()
  await page.getByText('8 PDA transitions · inspect and remove', { exact: true }).click()
  await page.getByRole('button', { name: 'Remove transition edge-0-in', exact: true }).click()
  await page.getByRole('tab', { name: 'Proof notebook' }).click()
  await expect(page.locator('.saved-claim > summary')).toContainText('Needs revision')
})

test('nested infinite-hop witnesses use a previously checked lemma', async ({ page }) => {
  await page.goto('workbench/simple-nested-infinite-hop?tab=proof')
  await page.getByLabel('Claim to path').selectOption('2')
  await page.getByLabel('Repeating word').fill('A')
  const first = page.locator('.witness').nth(0),
    second = page.locator('.witness').nth(1)
  await first.getByRole('button', { name: 'enter A → 1', exact: true }).click()
  await second.getByRole('button', { name: 'enter A → 2', exact: true }).click()
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('infinite-hop rules')
  await page.getByRole('button', { name: 'Save checked claim' }).click()
  await page.getByLabel('Repeating word').fill('B')
  await first.getByRole('button', { name: 'Use checked claim 1', exact: true }).click()
  await first.getByRole('button', { name: 'enter B → 1', exact: true }).click()
  await second.getByRole('button', { name: 'enter B → 3', exact: true }).click()
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('infinite-hop rules')
  await page.getByRole('button', { name: 'Save checked claim' }).click()
  await expect(page.getByRole('heading', { name: 'Saved claims (2)' })).toBeVisible()
})

test('native drawings become separate WIP conversions without overwriting the original maze', async ({
  page,
}) => {
  await page.goto('workbench/square')
  await page.getByRole('button', { name: 'Trace this drawing', exact: true }).click()
  await expect(page.locator('svg.trace-board image')).toHaveAttribute(
    'href',
    /^data:image\/png;base64,/
  )
  await page.getByLabel('New path label').fill('Main corridor')
  await page.getByRole('button', { name: 'Add path', exact: true }).click()
  await page.getByRole('button', { name: 'Save workbench' }).click()
  await expect(page.getByText('Saved to library', { exact: true })).toBeVisible()
  await page.goto('play/square')
  await expect(page.locator('.maze-stage canvas')).toBeVisible()
  await page.goto('workbench/square')
  await expect(
    page.getByText('1 paths · edit labels and helper states', { exact: true })
  ).toBeVisible()
  await expect(page.locator('svg.trace-board image')).toHaveAttribute(
    'href',
    /^data:image\/png;base64,/
  )
})

test('every source artwork can open a WIP workbench and source files resolve', async ({
  page,
  request,
}) => {
  for (const reference of references) {
    const asset = reference.asset.split('/').map(encodeURIComponent).join('/')
    const response = await request.get(asset)
    expect(response.status(), reference.title).toBe(200)
    expect(response.headers()['content-type'], reference.title).toMatch(
      /^(image\/|application\/pdf)/
    )
  }
  await page.goto('library')
  await page.getByRole('button', { name: /^Reference artwork \(\d+\)$/ }).click()
  await expect(page.getByRole('link', { name: 'Review WIP / trace', exact: true })).toHaveCount(43)
  await page.goto('workbench/draft-maze-images-geocaching-easter-13-10-png')
  await expect(
    page.getByRole('heading', { name: 'Geocaching Easter 13-#10', exact: true })
  ).toBeVisible()
  await expect(page.locator('svg.trace-board image')).toHaveAttribute(
    'href',
    /Geocaching_Easter_13-10\.png$/
  )
})

test('proof and trace controls fit a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of [
    `workbench/${cantor}?tab=proof`,
    'workbench/pda-guide-1',
    'analysis',
    'docs',
  ]) {
    await page.goto(path)
    await expect(page.locator('h1')).toBeVisible()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path
    ).toBe(true)
  }
})

test('unfinished proof witnesses persist across modes and reload', async ({ page }) => {
  await page.goto(`workbench/${cantor}?tab=proof`)
  await page.getByRole('button', { name: 'enter A → 1', exact: true }).click()
  await page.getByRole('button', { name: 'Save workbench' }).click()
  await expect(page.getByText('Saved to library', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Trace & PDA', exact: true }).click()
  await page.getByRole('tab', { name: 'Proof notebook', exact: true }).click()
  await expect(page.locator('.witness-current strong')).toHaveText('A · 1')
  await page.reload()
  await expect(page.locator('.witness-current strong')).toHaveText('A · 1')
  await expect(page.getByRole('heading', { name: 'Saved claims (0)' })).toBeVisible()
})

test('clearing every trace remains cleared after saving and reopening', async ({ page }) => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><path d="M10 10L80 10" fill="none" stroke="#406090"/></svg>'
  await page.goto('workbench/pda-guide-1')
  await page
    .getByLabel('Upload source artwork')
    .setInputFiles({ name: 'single.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) })
  await expect(page.locator('.trace-hit')).toHaveCount(1)
  const board = page.locator('svg.trace-board')
  await board.scrollIntoViewIfNeeded()
  const point = await board.evaluate((svg) => {
    const point = new DOMPoint(45, 10).matrixTransform((svg as SVGSVGElement).getScreenCTM()!)
    return { x: point.x, y: point.y }
  })
  await page.mouse.click(point.x, point.y)
  await page.getByRole('button', { name: 'Delete trace', exact: true }).click()
  await page.getByRole('button', { name: 'Save workbench', exact: true }).click()
  await expect(page.getByText('Saved to library', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.locator('.trace-hit')).toHaveCount(0)
})

test('joint Cantor hypotheses require a separate completed witness for every declared connection', async ({
  page,
}) => {
  const pairs = [
    ['1', '2'],
    ['2', '3'],
    ['2', '1'],
    ['3', '2'],
  ]
  const doc = {
    formatVersion: '1.0',
    representationType: 'infiniteRule',
    metadata: {
      id: 'joint-cantor',
      title: 'Joint Cantor example',
      tags: ['wip'],
      createdAt: '2026-10-09T00:00:00Z',
      updatedAt: '2026-10-09T00:00:00Z',
    },
    definition: {
      type: 'infiniteRule',
      paths: ['1', '2', '3'].map((id) => ({ id, label: id, color: '#3374a4', helper: false })),
      copies: ['A'],
      start: { path: '1', address: [] },
      goal: { path: '3', address: [] },
      allowedRule: 'cantorHop',
      review: 'wip',
      notes: [],
      claims: [],
      connections: pairs.flatMap(([from, to], index) => [
        {
          id: `edge-${index}-in`,
          from,
          to,
          operation: 'enter',
          copy: 'A',
          input: to,
          evidence: 'Joint example',
        },
        {
          id: `edge-${index}-out`,
          from: to,
          to: from,
          operation: 'exit',
          copy: 'A',
          input: from,
          evidence: 'Joint example',
        },
      ]),
    },
    renderConfig: {
      preferredRenderer: 'svg',
      maxDepth: 5,
      showBreadcrumbs: true,
      showBlockLabels: true,
      animationSpeed: 'normal',
    },
    solverConfig: { maxDepth: 16, maxNodes: 100000, timeoutMs: 10000, strategy: 'bfs' },
    annotations: [],
  }
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'joint.fmaze',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(doc)),
  })
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  await expect(page).toHaveURL(/\/play\/joint-cantor$/)
  await page.goto('workbench/joint-cantor?tab=proof')
  await page.getByLabel('Claim to path').selectOption('2')
  await page.getByText('Related connections · optional', { exact: true }).click()
  await page.getByRole('button', { name: 'Add related connection' }).click()
  await page.getByLabel('Related 2 to path').selectOption('3')
  const first = page.locator('.witness').nth(0),
    related = page.locator('.witness').nth(1)
  for (const move of ['enter A → 2', 'Use descendant hypothesis 2', 'exit A → 2'])
    await first.getByRole('button', { name: move, exact: true }).click()
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText(
    'Build the required witness'
  )
  for (const move of ['enter A → 1', 'Use descendant hypothesis', 'exit A → 3'])
    await related.getByRole('button', { name: move, exact: true }).click()
  await page.getByRole('button', { name: 'Check my proof' }).click()
  await expect(page.locator('.proof-check [role=status]')).toContainText('Cantor-hop rules')
  await page.getByRole('button', { name: 'Save checked claim' }).click()
  await expect(page.getByRole('heading', { name: 'Saved claims (1)' })).toBeVisible()
})
