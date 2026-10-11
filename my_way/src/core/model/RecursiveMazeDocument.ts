import type { RecursiveTourDefinition } from './recursiveTour'
import type { RecursivePortsDefinition } from './recursivePorts'
import type { SquareRecursiveDefinition } from './squareRecursive'
import type { BlockRecursiveDefinition } from './blockRecursive'
import type { GraphLabeledDefinition } from './graphLabeled'
import type { GeometricRecursiveDefinition } from './geometricRecursive'
import type { RepeatedDirectedDefinition } from './repeatedDirected'
import type { RenderConfig } from './renderConfig'
import type { SolverConfig } from './solverInterface'
import type { Annotation } from './annotation'
import type { MazeArtwork, PathMazeDefinition } from './pathMaze'

export type RepresentationType =
  | 'recursiveTour' // Recursive grid tours with per-room path constraints
  | 'squareRecursive' // Orel corridor geometry
  | 'blockRecursive' // Family B — koteitan fractal block
  | 'graphLabeled' // Family C — abstract node/portal graph
  | 'geometricRecursive'
  | 'repeatedDirected'
  | 'legacyWire'
  | 'recursivePorts'
  | 'pathPushdown'
  | 'infiniteRule' // Family D — Cantor/infinite descent

export type MazeDefinition =
  | RecursiveTourDefinition
  | SquareRecursiveDefinition
  | BlockRecursiveDefinition
  | GraphLabeledDefinition
  | GeometricRecursiveDefinition
  | RepeatedDirectedDefinition
  | RecursivePortsDefinition
  | PathMazeDefinition
  | { type: 'legacyWire'; asset: string }

export interface MazeMetadata {
  id: string // uuid
  title: string
  author?: string
  source?: string
  tags: string[]
  license?: string
  createdAt: string // ISO8601
  updatedAt: string
}

export interface RecursiveMazeDocument {
  formatVersion: '1.0'
  metadata: MazeMetadata
  representationType: RepresentationType
  definition: MazeDefinition
  renderConfig: RenderConfig
  solverConfig: SolverConfig
  annotations: Annotation[]
  artwork?: MazeArtwork
}
