import { ipcMain } from 'electron'
import { randomUUID as uuid } from 'crypto'
import { eq, asc, sql } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb, getSqlite } from '../db/connection'
import * as schema from '../db/schema'

export function registerCharactersHandlers(): void {
  const db = getDb()

  ipcMain.handle(IPC.CHARACTERS_GET_BY_WORK, async (_e, workId: string) => {
    return db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.workId, workId))
      .orderBy(asc(schema.characters.sortOrder))
      .all()
  })

  ipcMain.handle(
    IPC.CHARACTERS_CREATE,
    async (
      _e,
      data: {
        workId: string
        name: string
        role: '주인공' | '조연' | '악역' | '기타'
        description?: string
      }
    ) => {
      const now = new Date().toISOString()
      const id = uuid()

      const maxSort = db
        .select({ max: sql<number>`coalesce(max(${schema.characters.sortOrder}), -1)` })
        .from(schema.characters)
        .where(eq(schema.characters.workId, data.workId))
        .get()

      db.insert(schema.characters)
        .values({
          id,
          workId: data.workId,
          name: data.name,
          role: data.role,
          description: data.description || null,
          sortOrder: (maxSort?.max ?? -1) + 1,
          createdAt: now,
          updatedAt: now,
        })
        .run()
      return { id }
    }
  )

  ipcMain.handle(
    IPC.CHARACTERS_UPDATE,
    async (
      _e,
      id: string,
      data: Partial<{ name: string; role: string; description: string }>
    ) => {
      db.update(schema.characters)
        .set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(schema.characters.id, id))
        .run()
      return { success: true }
    }
  )

  ipcMain.handle(IPC.CHARACTERS_DELETE, async (_e, id: string) => {
    db.delete(schema.characters).where(eq(schema.characters.id, id)).run()
    return { success: true }
  })

  ipcMain.handle(IPC.CHARACTERS_REORDER, async (_e, orderedIds: string[]) => {
    const sqlite = getSqlite()
    const reorder = sqlite.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        db.update(schema.characters)
          .set({ sortOrder: i })
          .where(eq(schema.characters.id, orderedIds[i]))
          .run()
      }
    })
    reorder()
    return { success: true }
  })
}
