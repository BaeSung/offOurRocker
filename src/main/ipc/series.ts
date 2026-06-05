import { randomUUID as uuid } from 'crypto'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, safeHandle } from './utils'
import { getOrCreateDefaultFolderId } from './folders'

export function registerSeriesHandlers(): void {
  const db = getDb()

  safeHandle(IPC.SERIES_GET_ALL, async () => {
    return db.select().from(schema.series).orderBy(asc(schema.series.title)).all()
  })

  safeHandle(
    IPC.SERIES_CREATE,
    async (_e, data: { title: string; description?: string; folderId?: string }) => {
      const ts = now()
      const id = uuid()
      db.insert(schema.series)
        .values({
          id,
          folderId: data.folderId || getOrCreateDefaultFolderId(),
          title: data.title,
          description: data.description || null,
          createdAt: ts,
          updatedAt: ts,
        })
        .run()
      return { id }
    }
  )

  safeHandle(
    IPC.SERIES_UPDATE,
    async (_e, id: string, data: Partial<{ title: string; description: string; folderId: string | null }>) => {
      const updateData: { updatedAt: string; title?: string; description?: string; folderId?: string | null } = { updatedAt: now() }
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.folderId !== undefined) updateData.folderId = data.folderId
      db.update(schema.series).set(updateData).where(eq(schema.series.id, id)).run()
      return { success: true }
    }
  )

  safeHandle(IPC.SERIES_DELETE, async (_e, id: string) => {
    // Detach the series' works to standalone, keeping them filed under the
    // series' own folder so they don't fall into the "미분류" group.
    const target = db
      .select({ folderId: schema.series.folderId })
      .from(schema.series)
      .where(eq(schema.series.id, id))
      .get()
    const folderId = target?.folderId ?? getOrCreateDefaultFolderId()
    db.update(schema.works)
      .set({ seriesId: null, folderId, updatedAt: now() })
      .where(eq(schema.works.seriesId, id))
      .run()
    db.delete(schema.series).where(eq(schema.series.id, id)).run()
    return { success: true }
  })
}
