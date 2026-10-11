/**
 * IndexedDB layer for maze projects using the `idb` library.
 */
import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { RecursiveMazeDocument } from '../../core/model/RecursiveMazeDocument'
import type { ReplayDocument } from '../../core/replay/ReplayDocument'
import { normalizeReplay } from '../../core/replay/normalizeReplay'

export interface ProjectRecord {
  id: string
  title: string
  doc: RecursiveMazeDocument
  createdAt: string
  updatedAt: string
}

export interface ReplayRecord {
  id: string
  mazeId: string
  mazeTitle: string
  doc: ReplayDocument
  createdAt: string
}

export interface SolveRecord {
  id: string // mazeId (one record per maze — upsert by mazeId)
  mazeTitle: string
  bestMoves: number
  solvedAt: string // ISO8601
}

interface FractalMazeDB extends DBSchema {
  projects: {
    key: string
    value: ProjectRecord
    indexes: { 'by-updatedAt': string }
  }
  replays: {
    key: string
    value: ReplayRecord
    indexes: { 'by-mazeId': string }
  }
  solves: {
    key: string
    value: SolveRecord
  }
}

let dbPromise: Promise<IDBPDatabase<FractalMazeDB>> | null = null

function getDB(): Promise<IDBPDatabase<FractalMazeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FractalMazeDB>('fractal-maze', 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('projects', { keyPath: 'id' })
          store.createIndex('by-updatedAt', 'updatedAt')
        }
        if (oldVersion < 2) {
          const replayStore = db.createObjectStore('replays', { keyPath: 'id' })
          replayStore.createIndex('by-mazeId', 'mazeId')
        }
        if (oldVersion < 3) {
          db.createObjectStore('solves', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveProject(doc: RecursiveMazeDocument): Promise<void> {
  const db = await getDB()
  const record: ProjectRecord = {
    id: doc.metadata.id,
    title: doc.metadata.title,
    doc,
    createdAt: doc.metadata.createdAt,
    updatedAt: doc.metadata.updatedAt,
  }
  await db.put('projects', record)
}

export async function loadProject(id: string): Promise<ProjectRecord | undefined> {
  const db = await getDB()
  return db.get('projects', id)
}

export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('projects', 'by-updatedAt')
  return all.reverse() // most recently updated first
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('projects', id)
}

export async function saveReplay(r: ReplayRecord): Promise<void> {
  const db = await getDB()
  await db.put('replays', r)
}

export async function loadReplay(id: string): Promise<ReplayRecord | undefined> {
  const db = await getDB()
  const record = await db.get('replays', id)
  return record ? normalizeStoredReplay(record) : undefined
}

async function normalizeStoredReplay(record: ReplayRecord): Promise<ReplayRecord> {
  const db = await getDB()
  // Recover existing saved runs once; all new runs contain an immutable maze snapshot.
  if (!record.doc.maze) {
    const project = await db.get('projects', record.mazeId)
    const maze = project?.doc ?? (await import('../library/catalog')).loadCatalogMaze(record.mazeId)
    if (!maze)
      throw new Error(
        'The maze for this older replay is unavailable. Import its maze and save it to your library.'
      )
    record.doc.maze = maze
    await db.put('replays', record)
  }
  return { ...record, doc: normalizeReplay(record.doc) }
}

export async function listReplays(mazeId?: string): Promise<ReplayRecord[]> {
  const db = await getDB()
  const records = mazeId
    ? await db.getAllFromIndex('replays', 'by-mazeId', mazeId)
    : await db.getAll('replays')
  return Promise.all(records.map(normalizeStoredReplay))
}

export async function deleteReplay(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('replays', id)
}

export async function saveSolve(record: SolveRecord): Promise<void> {
  const db = await getDB()
  const existing = await db.get('solves', record.id)
  // Only update if this is a new solve or a better score
  if (!existing || record.bestMoves < existing.bestMoves) {
    await db.put('solves', record)
  }
}

export async function listSolves(): Promise<SolveRecord[]> {
  const db = await getDB()
  return db.getAll('solves')
}
