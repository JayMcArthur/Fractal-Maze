import { loadCatalogDocument } from '../library/loadCatalogDocument'
import { loadProject } from './db'

export async function loadMazeDocument(id: string) {
  const project = await loadProject(id)
  if (project) return project.doc
  return loadCatalogDocument(id)
}
