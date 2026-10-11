import { loadCatalogMaze } from '../library'
import { loadProject } from './db'
import { hydrateArtwork } from '../library/pathCatalog'

export async function loadMazeDocument(id: string) {
  const project = await loadProject(id)
  if (project) return project.doc
  const doc = loadCatalogMaze(id)
  return doc ? hydrateArtwork(doc) : null
}
