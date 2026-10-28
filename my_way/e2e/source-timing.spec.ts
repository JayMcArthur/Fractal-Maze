import { expect, test } from './fixtures'

const document = {
  formatVersion: '1.0',
  representationType: 'pathPushdown',
  metadata: {
    id: 'long-source-route',
    title: 'Long source route',
    tags: [],
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
  },
  definition: {
    type: 'pathPushdown',
    review: 'wip',
    allowedRule: 'finite',
    claims: [],
    notes: [],
    copies: ['A'],
    paths: ['1', '2', '3'].map((id) => ({ id, label: id, color: '#000', helper: false })),
    start: { path: '1', address: [] },
    goal: { path: '3', address: ['A'] },
    connections: [
      {
        id: 'enter',
        from: '1',
        to: '2',
        operation: 'enter',
        copy: 'A',
        input: '',
        evidence: 'Measured gate',
      },
      {
        id: 'finish',
        from: '2',
        to: '3',
        operation: 'walk',
        copy: '',
        input: '',
        evidence: 'Measured route',
      },
    ],
  },
  artwork: {
    asset:
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIi8+',
    width: 100,
    height: 100,
    bounds: [0, 0, 100, 100],
    frames: [{ id: 'A', x: 20, y: 20, width: 20, height: 20 }],
    start: [0, 10],
    goal: [0, 90],
    traces: [
      {
        id: 'long',
        path: '1',
        color: '#000',
        points: [
          [0, 10],
          [100, 10],
          [100, 20],
          [0, 20],
          [0, 30],
          [100, 30],
          [100, 40],
          [0, 40],
          [0, 50],
          [100, 50],
        ],
      },
      {
        id: 'next',
        path: '2',
        color: '#000',
        points: [
          [0, 70],
          [100, 70],
        ],
      },
      {
        id: 'last',
        path: '3',
        color: '#000',
        points: [
          [100, 90],
          [0, 90],
        ],
      },
    ],
    gates: [
      { edge: 'enter', from: [100, 50], to: [0, 70] },
      { edge: 'finish', from: [100, 70], to: [100, 90] },
    ],
  },
  renderConfig: {
    preferredRenderer: 'canvas',
    maxDepth: 3,
    showBreadcrumbs: true,
    showBlockLabels: false,
    animationSpeed: 'normal',
  },
  solverConfig: { strategy: 'bfs', maxDepth: 5, maxNodes: 10000, timeoutMs: 5000 },
  annotations: [],
}

test('long block motion takes time proportional to distance and replay waits for it', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-10T12:00:00Z') })
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name: 'long.fmaze',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(document)),
  })
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  await page.clock.pauseAt(new Date('2026-10-10T12:01:00Z'))
  await page.getByRole('button', { name: 'Enter A → path 2', exact: true }).click()
  await page.clock.runFor(2000)
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeDisabled()
  const markerBeforeViewChange = await page.getByTestId('source-player-marker').getAttribute('cx')
  await page.getByLabel('Local view', { exact: true }).uncheck()
  await page.clock.runFor(16)
  // Switching the camera must not restart the recorded departure at its beginning.
  expect(Number(await page.getByTestId('source-player-marker').getAttribute('cx'))).toBeGreaterThanOrEqual(Number(markerBeforeViewChange))
  await expect(page.locator('.digital-hud__metrics').getByText('0', { exact: true })).toBeVisible()
  await page.clock.runFor(12000)
  await expect(page.getByRole('button', { name: 'Undo move', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Walk → path 3', exact: true }).click()
  await page.clock.runFor(5000)
  await page.getByRole('button', { name: 'Save & play replay', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play replay', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play replay', exact: true }).click()
  await page.clock.runFor(3000)
  await expect(page.getByLabel('Replay position')).toHaveValue('1')
  await page.getByRole('button', { name: 'Pause replay', exact: true }).click()
  const marker = page.getByTestId('source-player-marker')
  const paused = [await marker.getAttribute('cx'), await marker.getAttribute('cy')]
  await page.clock.runFor(2000)
  expect([await marker.getAttribute('cx'), await marker.getAttribute('cy')]).toEqual(paused)
  await page.getByRole('button', { name: 'Play replay', exact: true }).click()
  await page.clock.runFor(16000)
  await expect(page.getByLabel('Replay position')).toHaveValue('2')
})
