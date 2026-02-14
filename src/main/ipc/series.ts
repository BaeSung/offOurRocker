import { ipcMain } from 'electron'
import { randomUUID as uuid } from 'crypto'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerSeriesHandlers(): void {
  const db = getDb()

  ipcMain.handle(IPC.SERIES_GET_ALL, async () => {
    return db.select().from(schema.series).orderBy(asc(schema.series.title)).all()
  })

  ipcMain.handle(
    IPC.SERIES_CREATE,
    async (_e, data: { title: string; description?: string }) => {
      const now = new Date().toISOString()
      const id = uuid()
      db.insert(schema.series)
        .values({
          id,
          title: data.title,
          description: data.description || null,
          createdAt: now,
          updatedAt: now,
        })
        .run()
      return { id }
    }
  )

  ipcMain.handle(
    IPC.SERIES_UPDATE,
    async (_e, id: string, data: Partial<{ title: string; description: string }>) => {
      const updateData: Record<string, any> = { updatedAt: new Date().toISOString() }
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      db.update(schema.series).set(updateData).where(eq(schema.series.id, id)).run()
      return { success: true }
    }
  )

  ipcMain.handle(IPC.SERIES_DELETE, async (_e, id: string) => {
    // Detach works from series (don't delete them)
    db.update(schema.works)
      .set({ seriesId: null, updatedAt: new Date().toISOString() })
      .where(eq(schema.works.seriesId, id))
      .run()
    db.delete(schema.series).where(eq(schema.series.id, id)).run()
    return { success: true }
  })
}
