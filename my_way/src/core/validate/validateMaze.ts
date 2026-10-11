import { validateBlockRoute } from '../blockMaze/grid'
import { validateTour } from '../recursiveTour/validation'
import type { RecursiveMazeDocument } from '../model/RecursiveMazeDocument'
import type { SquareRecursiveDefinition } from '../model/squareRecursive'
import type { BlockRecursiveDefinition } from '../model/blockRecursive'
import type { GraphLabeledDefinition, SubmazeNode } from '../model/graphLabeled'
import type { ValidationResult, ValidationIssue } from './ValidationResult'
import type { GeometricRecursiveDefinition } from '../model/geometricRecursive'
import type { RecursivePortsDefinition } from '../model/recursivePorts'
import type { RepeatedDirectedDefinition } from '../model/repeatedDirected'
import { validateGeometric, validateRepeated, validatePorts } from './nativeValidation'
import { artworkSchema, validatePathMaze } from '../pathMaze/validation'
import { validateArtwork } from '../pathMaze/validateArtwork'
import { documentHeader } from './documentHeader'
import { validateSquareRecursive } from './squareValidation'

function validateBlockRecursive(def: BlockRecursiveDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!Number.isInteger(def.unit) || def.unit < 2) {
    issues.push({
      severity: 'error',
      code: 'INVALID_BLOCK_UNIT',
      message: 'Block unit must be an integer of at least 2',
      location: 'definition.unit',
    })
  }
  if (def.pattern.length !== def.unit * def.unit) {
    issues.push({
      severity: 'error',
      code: 'BLOCK_PATTERN_SIZE',
      message: `Pattern contains ${def.pattern.length} cells; expected ${def.unit * def.unit}`,
      location: 'definition.pattern',
    })
  }
  if (def.pattern.some((cell) => cell !== 0 && cell !== 1)) {
    issues.push({
      severity: 'error',
      code: 'INVALID_BLOCK_CELL',
      message: 'Block patterns may only contain 0 (path) and 1 (wall)',
      location: 'definition.pattern',
    })
  }
  for (const [label, point] of [
    ['start', def.start],
    ['goal', def.goal],
  ] as const) {
    if (point && (point[0] < 0 || point[1] < 0 || point[0] >= def.unit || point[1] >= def.unit)) {
      issues.push({
        severity: 'error',
        code: 'BLOCK_POINT_BOUNDS',
        message: `${label} lies outside the base pattern`,
        location: `definition.${label}`,
      })
    }
  }
  if (def.providedRoute) {
    try {
      validateBlockRoute(def, def.providedRoute.depth, def.providedRoute.states, true)
    } catch {
      issues.push({
        severity: 'error',
        code: 'BLOCK_PROVIDED_ROUTE',
        message: 'Provided block route is invalid.',
      })
    }
  }
  return issues
}

function validateGraphLabeled(def: GraphLabeledDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodeIds = new Set<string>()
  const portalIds = new Set<string>()

  const visit = (node: SubmazeNode) => {
    if (nodeIds.has(node.id)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_GRAPH_NODE',
        message: `Duplicate graph node id "${node.id}"`,
        location: `definition.root.${node.id}`,
      })
    }
    nodeIds.add(node.id)
    for (const portal of node.portals) {
      if (portalIds.has(portal.id)) {
        issues.push({
          severity: 'error',
          code: 'DUPLICATE_GRAPH_PORTAL',
          message: `Duplicate portal id "${portal.id}"`,
          location: `portals.${portal.id}`,
        })
      }
      portalIds.add(portal.id)
    }
    node.children.forEach(visit)
  }
  visit(def.root)

  const checkConnections = (node: SubmazeNode) => {
    for (const portal of node.portals) {
      for (const target of portal.connectsTo) {
        if (!portalIds.has(target)) {
          issues.push({
            severity: 'error',
            code: 'UNKNOWN_GRAPH_PORTAL',
            message: `Portal "${portal.id}" connects to unknown portal "${target}"`,
            location: `portals.${portal.id}`,
          })
        }
      }
    }
    node.children.forEach(checkConnections)
  }
  checkConnections(def.root)

  for (const [label, portalId] of [
    ['entry', def.entryPortal],
    ['exit', def.exitPortal],
  ] as const) {
    if (!portalIds.has(portalId)) {
      issues.push({
        severity: 'error',
        code: 'UNKNOWN_GRAPH_ENDPOINT',
        message: `${label} portal "${portalId}" does not exist`,
        location: `definition.${label}Portal`,
      })
    }
  }
  return issues
}

export function validateMaze(doc: RecursiveMazeDocument): ValidationResult {
  if (!documentHeader.safeParse(doc).success) return {
    valid: false, issues: [{ severity: 'error', code: 'DOCUMENT_HEADER', message: 'Maze metadata, settings and representation must match the document format.' }],
  }
  const issues: ValidationIssue[] = []
  if (doc.definition.type !== doc.representationType)
    issues.push({
      severity: 'error',
      code: 'DEFINITION_TYPE',
      message: 'Definition and representation must match.',
    })
  if (doc.artwork && !artworkSchema.safeParse(doc.artwork).success)
    issues.push({
      severity: 'error',
      code: 'ARTWORK_SCHEMA',
      message: 'Artwork must contain valid source dimensions, traces, and copy frames.',
    })

  if (!doc.metadata?.title) {
    issues.push({
      severity: 'warning',
      code: 'MISSING_TITLE',
      message: 'Maze document has no title',
    })
  }

  if (doc.definition.type === 'legacyWire') {
    if (doc.definition.asset !== 'programs/wolf/index.html') issues.push({
      severity: 'error', code: 'WIRE_ASSET', message: 'The wire player must use the bundled Wolf program.',
    })
  } else if (doc.definition.type === 'recursiveTour') {
    issues.push(...validateTour(doc.definition))
  } else if (doc.representationType === 'squareRecursive') {
    issues.push(...validateSquareRecursive(doc.definition as SquareRecursiveDefinition))
  } else if (doc.representationType === 'blockRecursive') {
    issues.push(...validateBlockRecursive(doc.definition as BlockRecursiveDefinition))
  } else if (doc.representationType === 'graphLabeled') {
    issues.push(...validateGraphLabeled(doc.definition as GraphLabeledDefinition))
  } else if (doc.representationType === 'geometricRecursive') {
    issues.push(...validateGeometric(doc.definition as GeometricRecursiveDefinition))
  } else if (doc.representationType === 'recursivePorts') {
    issues.push(...validatePorts(doc.definition as RecursivePortsDefinition))
  } else if (doc.representationType === 'repeatedDirected') {
    issues.push(...validateRepeated(doc.definition as RepeatedDirectedDefinition))
  } else if (doc.definition.type === 'pathPushdown' || doc.definition.type === 'infiniteRule') {
    issues.push(...validatePathMaze(doc.definition))
    if (doc.artwork && artworkSchema.safeParse(doc.artwork).success)
      issues.push(...validateArtwork(doc.artwork, doc.definition))
  }

  return {
    valid: !issues.some((i) => i.severity === 'error'),
    issues,
  }
}
