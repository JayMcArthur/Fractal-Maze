import type { RecursivePortsDefinition } from '../model/recursivePorts'
import type { GeometricRecursiveDefinition } from '../model/geometricRecursive'
import { geometricGates, geometricWidth } from '../model/geometricRecursive'
import type { RepeatedDirectedDefinition } from '../model/repeatedDirected'
import type { ValidationIssue } from './ValidationResult'

export function validateGeometric(def: GeometricRecursiveDefinition): ValidationIssue[] {
  const maze = def.maze,
    issues: ValidationIssue[] = []
  const gates = new Set(geometricGates(maze).map((gate) => gate.id))
  const width = geometricWidth(maze.size)
  for (const path of maze.paths) {
    for (const gate of path.gates)
      if (!gates.has(gate))
        issues.push({
          severity: 'error',
          code: 'UNKNOWN_GEOMETRIC_GATE',
          message: `Path refers to unknown gate ${gate}`,
        })
    if (
      path.points.some(
        (point) =>
          !Number.isInteger(point.x) ||
          !Number.isInteger(point.y) ||
          point.x < 0 ||
          point.y < 0 ||
          point.x >= width ||
          point.y >= width
      )
    )
      issues.push({
        severity: 'error',
        code: 'GEOMETRIC_POINT_BOUNDS',
        message: 'Path point lies outside the geometric maze',
      })
  }
  const ids = maze.subMazes.map((sub) => sub.id)
  if (new Set(ids).size !== ids.length || ids.some((id) => ['_', 's', 'f'].includes(id)))
    issues.push({
      severity: 'error',
      code: 'GEOMETRIC_SUBMAZE_ID',
      message: 'Submaze IDs must be unique and distinct from _, s, and f',
    })
  return issues
}

export function validateRepeated(def: RepeatedDirectedDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const terminal = (value: string) =>
    (def.zero ? /^[CNESW]\d+$/ : /^[NESW]\d+$/).test(value) &&
    Number(value.slice(1)) < def.terminalsPerSide
  if (!Number.isInteger(def.terminalsPerSide) || def.terminalsPerSide < 2)
    issues.push({ severity: 'error', code: 'REPEATED_TERMINAL_COUNT',
      message: 'Repeated mazes need at least two terminals per side' })
  for (const type of ['normal', 'nx', 'ny', 'zero'] as const)
    for (const port of def[type] ?? []) {
      const boundary = !def.zero && type !== 'normal'
      const side = type === 'nx' ? 'E' : 'N'
      if (!terminal(port.from) || !terminal(port.to) ||
        (boundary && (port.from[0] !== side || port.to[0] !== side)))
        issues.push({ severity: 'error', code: 'REPEATED_PORT',
          message: `Invalid ${type} port ${port.from}->${port.to}` })
    }
  for (const state of [def.start, def.goal])
    if (!terminal(state.terminal) || !validRepeatedEndpoint(state, !!def.zero))
      issues.push({ severity: 'error', code: 'REPEATED_ENDPOINT',
        message: 'Start or goal is not a valid terminal state' })
  return issues
}

function validRepeatedEndpoint(state: RepeatedDirectedDefinition['start'], atomic: boolean) {
  if (!Number.isInteger(state.x) || !Number.isInteger(state.y) || state.x < 0 || state.y < 0)
    return false
  return atomic || !((state.terminal[0] === 'W' && !state.x) || (state.terminal[0] === 'S' && !state.y))
}

export function validatePorts(def: RecursivePortsDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const validBlock = (block: number) =>
    Number.isInteger(block) && block >= 0 && block < def.blocks.length
  if (!def.blocks.length || new Set(def.blocks).size !== def.blocks.length)
    issues.push({
      severity: 'error',
      code: 'PORT_BLOCKS',
      message: 'Port blocks must have unique names',
    })
  for (const rule of def.rules)
    if (
      rule.length !== 5 ||
      !rule.every(Number.isInteger) ||
      ![-1, 0, 1].includes(rule[2]) ||
      rule[1] < 0 ||
      rule[4] < 0 ||
      (rule[0] !== -1 && !validBlock(rule[0])) ||
      (rule[3] !== -1 && !validBlock(rule[3])) ||
      (rule[2] !== -1 && !validBlock(rule[3]))
    )
      issues.push({
        severity: 'error',
        code: 'PORT_RULE',
        message: 'Invalid recursive port transition',
      })
  for (const state of [def.start, def.goal, ...(def.providedRoute ?? [])])
    if (
      !state.blocks.length ||
      !state.blocks.every(validBlock) ||
      !Number.isInteger(state.port) ||
      state.port < 0
    )
      issues.push({
        severity: 'error',
        code: 'PORT_ENDPOINT',
        message: 'Invalid recursive port state',
      })
  return issues
}
