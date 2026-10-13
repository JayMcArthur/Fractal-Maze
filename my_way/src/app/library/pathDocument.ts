import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { MazeArtwork, PathMazeDefinition } from '../../core/model/pathMaze'
import { defaultRenderConfig } from '../../core/model/renderConfig'
import { defaultSolverConfig } from '../../core/model/solverInterface'

const date = '2026-10-09T00:00:00Z'
export function pathDocument(
  id: string,
  title: string,
  definition: PathMazeDefinition,
  artwork?: MazeArtwork
): RecursiveMazeDocument {
  return {
    formatVersion: '1.0',
    representationType: definition.type,
    metadata: {
      id,
      title,
      author: 'Source conversion',
      tags: [
        'paths',
        'pda',
        'wip',
        ...(definition.type === 'infiniteRule' ? ['infinite', 'proof'] : []),
      ],
      createdAt: date,
      updatedAt: date,
    },
    definition,
    artwork,
    annotations: [],
    renderConfig: { ...defaultRenderConfig },
    solverConfig: { ...defaultSolverConfig },
  }
}
export const emptyPathModel = (): PathMazeDefinition => ({
  type: 'pathPushdown',
  paths: [],
  copies: [],
  connections: [],
  start: null,
  goal: null,
  allowedRule: 'finite',
  claims: [],
  review: 'wip',
  notes: [],
})
