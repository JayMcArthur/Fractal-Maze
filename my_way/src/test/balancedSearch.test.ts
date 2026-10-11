import { expect, it } from 'vitest'
import type { PathMazeDefinition } from '../core/model/pathMaze'
import { balancedPathSearch } from '../core/pathMaze/balancedSearch'
import { applyConnection, reachesGoal, searchPaths } from '../core/pathMaze/traversal'

it('finds and reconstructs a finite witness beyond the bounded recursion depth', () => {
  const model: PathMazeDefinition = {
    type: 'pathPushdown',
    copies: ['A'],
    paths: [],
    connections: [],
    start: { path: 'u0', address: [] },
    goal: { path: 'd0', address: [] },
    allowedRule: 'finite',
    review: 'reviewed',
    notes: [],
    claims: [],
  }
  for (const side of ['u', 'd'])
    for (let i = 0; i <= 20; i++)
      model.paths.push({ id: `${side}${i}`, label: `${side}${i}`, color: '#000', helper: false })
  for (let i = 0; i < 20; i++) {
    model.connections.push({
      id: `enter-${i}`,
      from: `u${i}`,
      to: `u${i + 1}`,
      operation: 'enter',
      copy: 'A',
      input: '',
      evidence: '',
    })
    model.connections.push({
      id: `exit-${i}`,
      from: `d${i + 1}`,
      to: `d${i}`,
      operation: 'exit',
      copy: 'A',
      input: '',
      evidence: '',
    })
  }
  model.connections.push({
    id: 'turn',
    from: 'u20',
    to: 'd20',
    operation: 'walk',
    copy: '',
    input: '',
    evidence: '',
  })
  expect(searchPaths(model, 8).route).toBeNull()
  const route = balancedPathSearch(model)!
  expect(route.edges).toHaveLength(41)
  expect(Math.max(...route.states.map((state) => state.address.length))).toBe(20)
  for (const [index, edge] of route.edges.entries())
    expect(
      applyConnection(
        route.states[index],
        model.connections.find((connection) => connection.id === edge)!
      )
    ).toEqual(route.states[index + 1])
  expect(reachesGoal(model, route.states.at(-1)!)).toBe(true)
})

it('accepts exact nonempty endpoint stacks and prefers the shortest original witness among finishes', () => {
  const model: PathMazeDefinition = {
    type: 'pathPushdown', copies: ['A', 'B'],
    paths: ['s', 'm', 'g', '@endpoint:0'].map(id => ({ id, label: id, color: '#000', helper: false })),
    start: { path: 's', address: ['A', 'B'] }, goal: { path: 'g', address: ['A'] },
    alternateGoals: [{ path: 'm', address: ['A', 'B', 'B'] }],
    connections: [
      { id: 'leave', from: 's', to: 'm', operation: 'exit', copy: 'B', input: '', evidence: '' },
      { id: 'finish', from: 'm', to: 'g', operation: 'walk', copy: '', input: '', evidence: '' },
      { id: 'push-a', from: 's', to: 's', operation: 'enter', copy: 'A', input: '', evidence: '' },
      { id: 'push-b', from: 's', to: 'm', operation: 'enter', copy: 'B', input: '', evidence: '' },
    ], allowedRule: 'finite', review: 'reviewed', notes: [], claims: [],
  }
  const route = balancedPathSearch(model)!
  expect(route.edges).toEqual(['push-b'])
  expect(reachesGoal(model, route.states.at(-1)!)).toBe(true)
  for (const [index, id] of route.edges.entries())
    expect(applyConnection(route.states[index], model.connections.find(edge => edge.id === id)!)).toEqual(route.states[index + 1])
  const exact = { ...model, alternateGoals: [], goal: { path: 'g', address: ['B'] } }
  expect(balancedPathSearch(exact)).toBeNull()
  expect(balancedPathSearch({ ...model, goal: model.start, alternateGoals: [] })).toEqual({ states: [model.start], edges: [] })
})
