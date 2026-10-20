import { compilePlayDocument } from '../app/library/compilePlayDocument'
import { expect, it } from 'vitest'
import { catalog, loadCatalogMaze } from '../app/library/catalog'
import { squarePlayPDA } from '../app/library/playPDA'
import { exportPathPDA } from '../core/pathMaze/exportPDA'
import { importPathPDA } from '../core/pathMaze/importPDA'
import { detectAdapter } from '../core/io/detectFormat'
import { validateMaze } from '../core/validate/validateMaze'
import { emptyPathModel } from '../app/library/pathDocument'
import { applyConnection, availableMoves } from '../core/pathMaze/traversal'

it('round-trips every catalog PDA and compiled navigation model without changing transitions or endpoints', () => {
  let checked = 0
  for (const entry of catalog) {
    const original = loadCatalogMaze(entry.id)!
    const doc = compilePlayDocument(original)
    const model = doc.definition.type === 'squareRecursive' ? squarePlayPDA(doc)?.model :
      doc.definition.type === 'pathPushdown' || doc.definition.type === 'infiniteRule' ? doc.definition : null
    if (!model) continue
    const exported = exportPathPDA(model, entry.title)
    const adapter = detectAdapter(JSON.stringify(exported))!
    expect(adapter.formatName).toBe('Path PDA JSON')
    const imported = adapter.import(JSON.stringify(exported))
    expect(validateMaze(imported).valid).toBe(true)
    expect(imported.metadata.title).toBe(entry.title)
    const parsed = importPathPDA(exported).model
    expect(parsed.connections).toEqual(model.connections)
    expect(parsed.paths).toEqual(model.paths)
    expect(parsed.copies).toEqual(model.copies)
    expect(parsed.start).toEqual(model.start)
    expect(parsed.goal).toEqual(model.goal)
    expect(parsed.alternateGoals).toEqual(model.alternateGoals)
    expect(parsed.allowedRule).toBe(model.allowedRule)
    expect(parsed.type).toBe(model.type)
    expect(parsed.providedInput).toBe(model.providedInput)
    expect(parsed.surfaceSymbols).toEqual(model.surfaceSymbols)
    expect(parsed.claims).toEqual([])
    checked++
  }
  expect(checked).toBe(catalog.filter(entry => [
    'squareRecursive', 'geometricRecursive', 'recursivePorts', 'legacyWire', 'pathPushdown', 'infiniteRule',
  ].includes(loadCatalogMaze(entry.id)!.definition.type)).length)
})

const tiny = () => ({ ...emptyPathModel(),
  paths: ['one', 'two'].map(id => ({ id, label: id, color: '#3374a4', helper: false })),
  copies: ['A'], start: { path: 'one', address: [] }, goal: { path: 'two', address: ['A'] },
  connections: [{ id: 'in', from: 'one', to: 'two', copy: 'A', operation: 'enter' as const, input: '', evidence: 'test' }],
})

it('retains one-way gates, empty input, an empty alphabet and an explicit bottom-symbol copy', () => {
  const model = tiny()
  model.copies.push('⊥')
  const output = exportPathPDA(model)
  expect(output.bottom).toBe('⊥⊥')
  const imported = importPathPDA(output).model
  expect(availableMoves(imported, model.start)).toHaveLength(1)
  expect(availableMoves(imported, model.goal)).toHaveLength(0)
  expect(applyConnection(model.start, imported.connections[0])).toEqual(model.goal)
  const empty = { ...tiny(), copies: [], connections: [], goal: model.start }
  expect(importPathPDA(exportPathPDA(empty)).model.connections).toEqual([])
})

it('rejects missing guards, duplicate rules, altered stack operations and unknown addresses before creating a player', () => {
  const valid = exportPathPDA(tiny())
  const missing = structuredClone(valid)
  missing.transitions.pop()
  expect(() => importPathPDA(missing)).toThrow('incomplete or duplicate')
  const duplicate = structuredClone(valid)
  duplicate.transitions[1] = duplicate.transitions[0]
  expect(() => importPathPDA(duplicate)).toThrow('stack-dependent')
  const changed = structuredClone(valid)
  changed.transitions[1].to = 'one'
  expect(() => importPathPDA(changed)).toThrow('stack-dependent')
  const compound = structuredClone(valid)
  compound.transitions[0].push.push('A')
  expect(() => importPathPDA(compound)).toThrow('not a path')
  expect(() => importPathPDA({ ...valid, goal: { path: 'missing', address: [] } })).toThrow('unknown path')
  expect(() => importPathPDA({ ...valid, stackAlphabet: ['⊥', '⊥', 'A'] })).toThrow('distinct bottom')
  expect(() => importPathPDA({ ...valid, inputAlphabet: ['x'] })).toThrow('input alphabet')
})

it('reads earlier exports while requiring infinite movement certificates to be reconstructed separately', () => {
  const output = exportPathPDA(tiny())
  const old = { ...output, representationType: undefined, allowedRule: undefined,
    transitions: output.transitions.map(rule => ({ ...rule, evidence: undefined })) }
  expect(importPathPDA(JSON.stringify(old)).model.connections[0].evidence).toBe('Imported path-PDA transition')
  const infinite = { ...tiny(), type: 'infiniteRule' as const, allowedRule: 'infiniteHop' as const }
  const imported = importPathPDA(exportPathPDA(infinite)).model
  expect(imported.allowedRule).toBe('infiniteHop')
  expect(imported.claims).toEqual([])
  expect(() => importPathPDA({ ...exportPathPDA(infinite), extraMovementRule: 'cantorHop' })).toThrow('disagree')
})
