import { describe, expect, it } from 'vitest'
import { loadCatalogMaze } from '../app/library'
import type { SquareRecursiveDefinition } from '../core/model/squareRecursive'
import { cameraTransition, contextRect, fullView, interpolateView } from '../core/render/canvas/squareCamera'

const def = loadCatalogMaze('alice-in-wonderland')!.definition as SquareRecursiveDefinition

describe('recursive camera', () => {
  it('maps a nested gate into the exact descendant rectangle', () => {
    const names = [def.blocks[0].name, def.blocks[1].name]
    const outer = contextRect(def, [names[0]])
    const inner = contextRect(def, [names[1]])
    const full = fullView(def)
    const nested = contextRect(def, names)
    expect(nested.x).toBeCloseTo(outer.x + inner.x * outer.width / full.width)
    expect(nested.y).toBeCloseTo(outer.y + inner.y * outer.height / full.height)
    expect(nested.width).toBeCloseTo(inner.width * outer.width / full.width)
    expect(nested.height).toBeCloseTo(inner.height * outer.height / full.height)
  })

  it('uses inverse frames when leaving a recursive context', () => {
    const root = ['0']
    const nested = ['0', def.blocks[0].name, def.blocks[1].name]
    const enter = cameraTransition(def, root, nested)!
    const exit = cameraTransition(def, nested, root)!
    expect(enter.stack).toEqual(root)
    expect(enter.levels).toBe(2)
    expect(enter.from).toEqual(exit.to)
    expect(enter.to).toEqual(exit.from)
    expect(interpolateView(enter.from, enter.to, 0)).toEqual(enter.from)
    const final = interpolateView(enter.from, enter.to, 1)
    expect(final.x).toBeCloseTo(enter.to.x)
    expect(final.width).toBeCloseTo(enter.to.width)
    expect(cameraTransition(def, root, root)).toBeNull()
  })
})
