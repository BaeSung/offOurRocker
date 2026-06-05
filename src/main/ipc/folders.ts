import { randomUUID as uuid } from 'crypto'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, getNextSortOrder, safeHandle } from './utils'

/**
 * Returns the id of the default (first) folder, creating "기본 폴더" if none
 * exists yet. Used when a series/work is created without an explicit folder so
 * nothing ever ends up unfiled.
 */
export function getOrCreateDefaultFolderId(): string {
  const db = getDb()
  const first = db
    .select({ id: schema.folders.id })
    .from(schema.folders)
    .orderBy(asc(schema.folders.sortOrder), asc(schema.folders.createdAt))
    .get()
  if (first) return first.id

  const ts = now()
  const id = uuid()
  db.insert(schema.folders)
    .values({ id, title: '기본 폴더', sortOrder: 0, createdAt: ts, updatedAt: ts })
    .run()
  return id
}

export function registerFoldersHandlers(): void {
  const db = getDb()

  safeHandle(IPC.FOLDERS_GET_ALL, async () => {
    return db
      .select()
      .from(schema.folders)
      .orderBy(asc(schema.folders.sortOrder), asc(schema.folders.createdAt))
      .all()
  })

  safeHandle(IPC.FOLDERS_CREATE, async (_e, data: { title: string }) => {
    const ts = now()
    const id = uuid()
    const sortOrder = getNextSortOrder(schema.folders.sortOrder, schema.folders)
    db.insert(schema.folders)
      .values({ id, title: data.title, sortOrder, createdAt: ts, updatedAt: ts })
      .run()
    return { id }
  })

  safeHandle(IPC.FOLDERS_UPDATE, async (_e, id: string, data: Partial<{ title: string }>) => {
    const updateData: { updatedAt: string; title?: string } = { updatedAt: now() }
    if (data.title !== undefined) updateData.title = data.title
    db.update(schema.folders).set(updateData).where(eq(schema.folders.id, id)).run()
    return { success: true }
  })

  // Delete a folder. Its series/standalone works are moved to another existing
  // folder so they are never orphaned. The last remaining folder cannot be
  // deleted (there must always be at least one top-level directory).
  safeHandle(IPC.FOLDERS_DELETE, async (_e, id: string) => {
    const all = db
      .select({ id: schema.folders.id })
      .from(schema.folders)
      .orderBy(asc(schema.folders.sortOrder), asc(schema.folders.createdAt))
      .all()
    if (all.length <= 1) {
      return { success: false, error: 'last-folder' }
    }
    const fallback = all.find((f) => f.id !== id)
    const fallbackId = fallback ? fallback.id : null
    const ts = now()
    db.update(schema.series)
      .set({ folderId: fallbackId, updatedAt: ts })
      .where(eq(schema.series.folderId, id))
      .run()
    db.update(schema.works)
      .set({ folderId: fallbackId, updatedAt: ts })
      .where(eq(schema.works.folderId, id))
      .run()
    db.delete(schema.folders).where(eq(schema.folders.id, id)).run()
    return { success: true, fallbackId }
  })
}
