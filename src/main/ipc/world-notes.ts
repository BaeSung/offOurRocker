import { ipcMain } from 'electron'
import { randomUUID as uuid } from 'crypto'
import { eq, asc, sql } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb, getSqlite } from '../db/connection'
import * as schema from '../db/schema'

export function registerWorldNotesHandlers(): void {
  const db = getDb()

  ipcMain.handle(IPC.WORLD_NOTES_GET_BY_WORK, async (_e, workId: string) => {
    return db
      .select()
      .from(schema.worldNotes)
      .where(eq(schema.worldNotes.workId, workId))
      .orderBy(asc(schema.worldNotes.sortOrder))
      .all()
  })

  ipcMain.handle(
    IPC.WORLD_NOTES_CREATE,
    async (
      _e,
      data: {
        workId: string
        category: '장소' | '세력' | '설정' | '역사' | '기타'
        title: string
        content?: string
      }
    ) => {
      const now = new Date().toISOString()
      const id = uuid()

      const maxSort = db
        .select({ max: sql<number>`coalesce(max(${schema.worldNotes.sortOrder}), -1)` })
        .from(schema.worldNotes)
        .where(eq(schema.worldNotes.workId, data.workId))
        .get()

      db.insert(schema.worldNotes)
        .values({
          id,
          workId: data.workId,
          category: data.category,
          title: data.title,
          content: data.content || null,
          sortOrder: (maxSort?.max ?? -1) + 1,
          createdAt: now,
          updatedAt: now,
        })
        .run()
      return { id }
    }
  )

  ipcMain.handle(
    IPC.WORLD_NOTES_UPDATE,
    async (
      _e,
      id: string,
      data: Partial<{ category: string; title: string; content: string }>
    ) => {
      db.update(schema.worldNotes)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(schema.worldNotes.id, id))
        .run()
      return { success: true }
    }
  )

  ipcMain.handle(IPC.WORLD_NOTES_DELETE, async (_e, id: string) => {
    db.delete(schema.worldNotes).where(eq(schema.worldNotes.id, id)).run()
    return { success: true }
  })

  ipcMain.handle(IPC.WORLD_NOTES_REORDER, async (_e, orderedIds: string[]) => {
    const sqlite = getSqlite()
    const reorder = sqlite.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        db.update(schema.worldNotes)
          .set({ sortOrder: i })
          .where(eq(schema.worldNotes.id, orderedIds[i]))
          .run()
      }
    })
    reorder()
    return { success: true }
  })
}
