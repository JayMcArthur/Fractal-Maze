import { expect, it } from 'vitest'
import { connectionsFromText } from '../core/pathMaze/connectionInput'
import { emptyPathModel } from '../app/library/pathDocument'
import { applyConnection } from '../core/pathMaze/traversal'

const model = () => ({ ...emptyPathModel(),
  paths: ['1', '2', '3', 'path-with-hyphens'].map(id => ({ id, label: id === '3' ? 'Finish' : id, color: '#3374a4', helper: false })),
  copies: ['A', 'B'],
})

it('follows directed entries/exits in the declared address context and accepts labels without renaming IDs', () => {
  const edges = connectionsFromText(model(), '1 -> A.2\nA.2 → Finish\nFinish -> path-with-hyphens', 'Drawing review')
  expect(edges).toHaveLength(3)
  const inside = applyConnection({ path: '1', address: ['B'] }, edges[0])!
  expect(inside).toEqual({ path: '2', address: ['B', 'A'] })
  expect(applyConnection(inside, edges[1])).toEqual({ path: '3', address: ['B'] })
  expect(applyConnection({ path: '2', address: ['B'] }, edges[1])).toBeNull()
  expect(edges[2].to).toBe('path-with-hyphens')
  expect(edges.every(edge => edge.evidence === 'Drawing review' && !edge.input)).toBe(true)
})

it('adds reverse connections only for an explicit two-way arrow, including self-copy gates', () => {
  const edges = connectionsFromText(model(), '1 ↔ A.1\r\n\n2 <-> Finish', 'test')
  expect(edges.map(edge => edge.operation)).toEqual(['enter', 'exit', 'walk', 'walk'])
  expect(new Set(edges.map(edge => edge.id)).size).toBe(4)
  expect(applyConnection({ path: '1', address: ['A'] }, edges[1])).toEqual({ path: '1', address: [] })
  expect(applyConnection({ path: '1', address: [] }, edges[1])).toBeNull()
})

it('reports the exact invalid line and rejects unsupported multi-copy guards without adding a partial model', () => {
  const original = model(), before = structuredClone(original)
  expect(() => connectionsFromText(original, '1 -> A.2\nB.A.2 -> 3', 'test')).toThrow('Line 2')
  expect(() => connectionsFromText(original, 'A.1 -> B.2', 'test')).toThrow('both ends')
  expect(() => connectionsFromText(original, '1 -> unknown', 'test')).toThrow('Unknown')
  expect(() => connectionsFromText(original, 'bad', 'test')).toThrow('Use')
  expect(() => connectionsFromText(original, ' \n ', 'test')).toThrow('at least one')
  expect(() => connectionsFromText(original, 'a'.repeat(20001), 'test')).toThrow('20,000')
  expect(original).toEqual(before)
})

it('rejects ambiguous labels or overlapping copy/path notation instead of selecting an arbitrary path', () => {
  const original = model()
  original.paths[0].label = 'Same'
  original.paths[1].label = 'Same'
  expect(() => connectionsFromText(original, 'Same -> 3', 'test')).toThrow('ambiguous')
  original.copies.push('A.B')
  original.paths.push({ id: 'B.2', label: 'Other', color: '#3374a4', helper: false })
  expect(() => connectionsFromText(original, '1 -> A.B.2', 'test')).toThrow('ambiguous')
})
