import { ipcMain } from 'electron'
import { eq, desc, sql } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerTrashHandlers(): void {
  const db = getDb()

  // List all soft-deleted works
  ipcMain.handle(IPC.TRASH_LIST, async () => {
    const deletedWorks = db
      .select({
        id: schema.works.id,
        title: schema.works.title,
        type: schema.works.type,
        genre: schema.works.genre,
        deletedAt: schema.works.deletedAt,
        charCount: sql<number>`(
          SELECT coalesce(sum(length(replace(content, ' ', ''))), 0)
          FROM chapters WHERE work_id = ${schema.works.id}
        )`,
      })
      .from(schema.works)
      .where(eq(schema.works.deleted, 1))
      .orderBy(desc(schema.works.deletedAt))
      .all()

    return deletedWorks
  })

  // Restore a soft-deleted work
  ipcMain.handle(IPC.TRASH_RESTORE, async (_e, workId: string) => {
    db.update(schema.works)
      .set({
        deleted: 0,
        deletedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.works.id, workId))
      .run()


    return { success: true }
  })

  // Permanently delete a work and its chapters/versions
  ipcMain.handle(IPC.TRASH_PERMANENT_DELETE, async (_e, workId: string) => {
    // Chapters and versions cascade-delete from the FK constraint
    db.delete(schema.works)
      .where(eq(schema.works.id, workId))
      .run()


    return { success: true }
  })

  // Empty trash (permanently delete all soft-deleted works)
  ipcMain.handle(IPC.TRASH_EMPTY, async () => {
    const deletedWorks = db
      .select({ id: schema.works.id })
      .from(schema.works)
      .where(eq(schema.works.deleted, 1))
      .all()

    for (const w of deletedWorks) {
      db.delete(schema.works)
        .where(eq(schema.works.id, w.id))
        .run()
    }


    return { success: true, count: deletedWorks.length }
  })
}
