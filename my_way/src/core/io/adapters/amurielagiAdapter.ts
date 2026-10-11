import { z } from 'zod'
import type { ImportAdapter, ExportAdapter } from '../AdapterInterface'
import type { RecursiveMazeDocument } from '../../model/RecursiveMazeDocument'
import type { GeometricMaze, GeometricRecursiveDefinition } from '../../model/geometricRecursive'
import { defaultRenderConfig } from '../../model/renderConfig'
import { defaultSolverConfig } from '../../model/solverInterface'

const point = z.object({ x: z.number().int(), y: z.number().int() }).passthrough()
const endpoint = point.extend({ id: z.string() })
const mazeSchema = z.object({
  uid: z.string(), token: z.literal('FRACTAL-MAZE.v2'), name: z.string(),
  size: z.number().int().min(1).max(30),
  paths: z.array(z.object({ color: z.string(), points: z.array(point), gates: z.array(z.string()), head: point.optional() }).passthrough()),
  startingPoint: endpoint, finish: endpoint.nullable(), subMazes: z.array(endpoint),
}).passthrough()

export function importGeometricCollection(raw: string | object): RecursiveMazeDocument[] {
  const mazes = z.array(mazeSchema).min(1).parse(typeof raw === 'string' ? JSON.parse(raw) : raw)
  const now = new Date().toISOString()
  return mazes.map((maze) => ({
    formatVersion: '1.0',
    metadata: { id: maze.uid, title: maze.name, tags: ['amurielagi', 'geometric'], createdAt: now, updatedAt: now },
    representationType: 'geometricRecursive',
    definition: { type: 'geometricRecursive', maze: maze as GeometricMaze },
    renderConfig: { ...defaultRenderConfig }, solverConfig: { ...defaultSolverConfig }, annotations: [],
  }))
}

export const amurielagiImportAdapter: ImportAdapter = {
  formatName: 'amurielagi FRACTAL-MAZE.v2', fileExtensions: ['.json'],
  canImport(raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(data) && data.length > 0 && data.every((maze) => maze?.token === 'FRACTAL-MAZE.v2')
    } catch { return false }
  },
  import(raw) {
    const docs = importGeometricCollection(raw)
    if (docs.length !== 1) throw new Error('This file contains a collection. Import all mazes with importCollection.')
    return docs[0]
  },
  importCollection: importGeometricCollection,
}

export const amurielagiExportAdapter: ExportAdapter = {
  formatName: 'FRACTAL-MAZE.v2', fileExtension: '.json',
  export(doc) {
    if (doc.representationType !== 'geometricRecursive') throw new Error('FRACTAL-MAZE.v2 requires a geometric maze')
    return JSON.stringify([(doc.definition as GeometricRecursiveDefinition).maze], null, 2)
  },
}
