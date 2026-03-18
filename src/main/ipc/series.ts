import { randomUUID as uuid } from 'crypto'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, safeHandle } from './utils'

export function registerSeriesHandlers(): void {
  const db = getDb()

  safeHandle(IPC.SERIES_GET_ALL, async () => {
    return db.select().from(schema.series).orderBy(asc(schema.series.title)).all()
  })

  safeHandle(
    IPC.SERIES_CREATE,
    async (_e, data: { title: string; description?: string }) => {
      const ts = now()
      const id = uuid()
      db.insert(schema.series)
        .values({
          id,
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
    async (_e, id: string, data: Partial<{ title: string; description: string }>) => {
      const updateData: { updatedAt: string; title?: string; description?: string } = { updatedAt: now() }
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      db.update(schema.series).set(updateData).where(eq(schema.series.id, id)).run()
      return { success: true }
    }
  )

  safeHandle(IPC.SERIES_DELETE, async (_e, id: string) => {
    db.update(schema.works)
      .set({ seriesId: null, updatedAt: now() })
      .where(eq(schema.works.seriesId, id))
      .run()
    db.delete(schema.series).where(eq(schema.series.id, id)).run()
    return { success: true }
  })
}
