import { z } from 'zod'

const types = z.enum(['recursiveTour', 'squareRecursive', 'blockRecursive', 'graphLabeled', 'geometricRecursive', 'repeatedDirected', 'legacyWire', 'recursivePorts', 'pathPushdown', 'infiniteRule'])
export const documentHeader = z.object({
  formatVersion: z.literal('1.0'), representationType: types,
  metadata: z.object({ id: z.string().min(1), title: z.string().optional(), author: z.string().optional(), source: z.string().optional(), tags: z.array(z.string()), createdAt: z.string(), updatedAt: z.string() }),
  definition: z.object({ type: types }),
  renderConfig: z.object({ preferredRenderer: z.enum(['canvas', 'svg', 'auto']), maxDepth: z.number().int().nonnegative(), showBreadcrumbs: z.boolean(), showBlockLabels: z.boolean(), animationSpeed: z.enum(['slow', 'normal', 'fast', 'instant']) }),
  solverConfig: z.object({ maxDepth: z.number().int().nonnegative(), maxNodes: z.number().int().positive(), timeoutMs: z.number().positive(), strategy: z.enum(['bfs', 'dfs', 'astar', 'iddfs']) }),
  annotations: z.array(z.object({ id: z.string(), type: z.enum(['note', 'highlight', 'arrow']), row: z.number().int(), col: z.number().int(), blockPath: z.array(z.string()), content: z.string().optional(), color: z.string().optional() })),
})
