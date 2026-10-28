import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { pathDocument, emptyPathModel } from '../src/app/library/pathDocument'

async function importMaze(page: Page, name: string, content: string) {
  await page.goto('library')
  await page.getByRole('button', { name: 'Import maze', exact: true }).click()
  await page.locator('input[type=file]').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: Buffer.from(content),
  })
  await page.getByRole('button', { name: 'Load Maze', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Maze replays', exact: true })).toBeVisible()
  await page.clock.pauseAt(new Date('2026-10-20T12:01:00Z'))
}

function corridor() {
  return pathDocument(
    'held-corridor',
    'Held corridor',
    {
      ...emptyPathModel(),
      paths: [{ id: '1', label: '1', color: '#557755', helper: false }],
      start: { path: '1', address: [] },
      goal: { path: '1', address: [] },
      review: 'reviewed',
    },
    {
      asset: '',
      blockSize: 1,
      width: 20,
      height: 3,
      bounds: [0, 0, 20, 3],
      frames: [],
      traces: [
        {
          id: 'corridor',
          path: '1',
          color: '#557755',
          points: [
            [0.5, 1.5],
            [19.5, 1.5],
          ],
        },
        ...Array.from({ length: 20 }, (_, x) => ({
          id: `branch-${x}`,
          path: '1',
          color: '#557755',
          points: [
            [x + 0.5, 1.5],
            [x + 0.5, 0.5],
          ] as [number, number][],
        })),
      ],
      start: [0.5, 1.5],
      goal: [19.5, 1.5],
    }
  )
}

for (const kind of ['path', 'square'] as const) {
  test(`${kind} movement repeats while held and stops on release`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-10-20T12:00:00Z') })
    if (kind === 'path') await importMaze(page, 'corridor.fmaze', JSON.stringify(corridor()))
    else
      await importMaze(
        page,
        'corridor.maze',
        `TILE_SIZE 30\n04${'05'.repeat(18)}01\nPLAYER 0 0\nTROPHY 0 19\n`
      )
    const moves = page
      .locator('.digital-hud__metrics > div')
      .filter({ hasText: 'Moves' })
      .locator('dd')
    await page.keyboard.down('ArrowRight')
    await page.clock.runFor(900)
    expect(Number(await moves.innerText())).toBeGreaterThan(2)
    await page.keyboard.up('ArrowRight')
    const stopped = await moves.innerText()
    await page.clock.runFor(1000)
    await expect(moves).toHaveText(stopped)
  })
}

test('a held path key retries a wall and is cancelled by blur and editable focus', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T12:00:00Z') })
  await importMaze(page, 'corridor.fmaze', JSON.stringify(corridor()))
  const moves = page
    .locator('.digital-hud__metrics > div')
    .filter({ hasText: 'Moves' })
    .locator('dd')
  await page.keyboard.down('ArrowLeft')
  await page.clock.runFor(500)
  await expect(moves).toHaveText('0')
  await page.getByRole('button', { name: 'Move east', exact: true }).click()
  await page.clock.runFor(900)
  // The still-held left key must retry after the button moves away from the wall.
  await expect(page.getByRole('button', { name: 'Save & play replay' })).toBeDisabled()
  await page.keyboard.up('ArrowLeft')
  await page.keyboard.down('d')
  await page.clock.runFor(500)
  expect(Number(await moves.innerText())).toBeGreaterThan(1)
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  const stopped = await moves.innerText()
  await page.clock.runFor(1000)
  await expect(moves).toHaveText(stopped)
  await page.keyboard.up('d')
  await page.keyboard.down('l')
  await page.evaluate(() => {
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
  })
  const editing = await moves.innerText()
  await page.clock.runFor(1000)
  await expect(moves).toHaveText(editing)
  await page.keyboard.up('l')
})

test('a held direction continues through copy crossings without losing its stack', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T12:00:00Z') })
  const doc = corridor()
  doc.definition = {
    ...(doc.definition as ReturnType<typeof emptyPathModel>),
    copies: ['A'],
    goal: { path: '1', address: Array(20).fill('A') },
    connections: [
      {
        id: 'enter',
        from: '1',
        to: '1',
        operation: 'enter',
        copy: 'A',
        input: '',
        evidence: 'Fixture',
      },
    ],
  }
  doc.artwork!.frames = [{ id: 'A', x: 3.5, y: 0, width: 4, height: 3 }]
  doc.artwork!.gates = [{ edge: 'enter', from: [3.5, 1.5], to: [0.5, 1.5] }]
  await importMaze(page, 'copy.fmaze', JSON.stringify(doc))
  await page.keyboard.down('ArrowRight')
  await page.clock.runFor(2200)
  await page.keyboard.up('ArrowRight')
  await page.clock.runFor(500)
  const depth = page
    .locator('.digital-hud__metrics > div')
    .filter({ hasText: 'Depth' })
    .locator('dd')
  expect(Number(await depth.innerText())).toBeGreaterThan(1)
  const stopped = await depth.innerText()
  await page.clock.runFor(1000)
  await expect(depth).toHaveText(stopped)
})

test('opening a proof cancels held movement until a new press', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T12:00:00Z') })
  const doc = corridor()
  doc.representationType = 'infiniteRule'
  doc.definition = {
    ...(doc.definition as ReturnType<typeof emptyPathModel>),
    type: 'infiniteRule',
    allowedRule: 'infiniteHop',
  }
  await importMaze(page, 'proof.fmaze', JSON.stringify(doc))
  await page.keyboard.down('ArrowRight')
  await page.clock.runFor(200)
  await page.getByRole('button', { name: 'Open proof notebook', exact: true }).click()
  const moves = page
    .locator('.digital-hud__metrics > div')
    .filter({ hasText: 'Moves' })
    .locator('dd')
  const stopped = await moves.innerText()
  await page.clock.runFor(1000)
  await expect(moves).toHaveText(stopped)
  await page.getByRole('button', { name: 'Return to maze', exact: true }).click()
  await page.clock.runFor(1000)
  await expect(moves).toHaveText(stopped)
  await page.keyboard.up('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await page.clock.runFor(200)
  expect(Number(await moves.innerText())).toBe(Number(stopped) + 1)
})

test('a held pattern key advances exact native coordinates and stops on release', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-20T12:00:00Z') })
  const map = Array.from({ length: 9 }, () => Array(9).fill(0))
  map[8][8] = 1
  await importMaze(
    page,
    'pattern.json',
    JSON.stringify({ map, start: [0, 8], goal: [8, 0], drawdepth: 1 })
  )
  await page.keyboard.down('ArrowUp')
  await page.clock.runFor(700)
  const status = page.locator('section .format-status')
  const value = await status.innerText()
  expect(Number(value.match(/step (\d+)/)![1])).toBeGreaterThan(2)
  await page.keyboard.up('ArrowUp')
  await page.clock.runFor(1000)
  await expect(status).toHaveText(value)
})

test('a released tap queues only the latest direction and focus cancels pending input', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T12:00:00Z') })
  await importMaze(page, 'corridor.fmaze', JSON.stringify(corridor()))
  const marker = page.getByTestId('source-player-marker')
  await page.keyboard.press('ArrowRight')
  await page.clock.runFor(16)
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowUp')
  await page.clock.runFor(1000)
  // East reaches the next junction, then the last short tap takes its north branch.
  await expect(marker).toHaveAttribute('cy', '0.5')
  await expect(marker).toHaveAttribute('cx', '1.5')
  await page.clock.runFor(500)
  await expect(marker).toHaveAttribute('cy', '0.5')
  await page.keyboard.press('ArrowDown')
  await page.clock.runFor(16)
  await page.keyboard.press('ArrowRight')
  await page.evaluate(() => {
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
  })
  await page.clock.runFor(1000)
  await expect(marker).toHaveAttribute('cx', '1.5')
})
