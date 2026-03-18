import { randomUUID as uuid } from 'crypto'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, getNextSortOrder, reorderByIds, safeHandle } from './utils'

export function registerWorldNotesHandlers(): void {
  const db = getDb()

  safeHandle(IPC.WORLD_NOTES_GET_BY_WORK, async (_e, workId: string) => {
    return db
      .select()
      .from(schema.worldNotes)
      .where(eq(schema.worldNotes.workId, workId))
      .orderBy(asc(schema.worldNotes.sortOrder))
      .all()
  })

  safeHandle(
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
      const ts = now()
      const id = uuid()
      const sortOrder = getNextSortOrder(
        schema.worldNotes.sortOrder,
        schema.worldNotes,
        schema.worldNotes.workId,
        data.workId
      )

      db.insert(schema.worldNotes)
        .values({
          id,
          workId: data.workId,
          category: data.category,
          title: data.title,
          content: data.content || null,
          sortOrder,
          createdAt: ts,
          updatedAt: ts,
        })
        .run()
      return { id }
    }
  )

  safeHandle(
    IPC.WORLD_NOTES_UPDATE,
    async (
      _e,
      id: string,
      data: Partial<{ category: string; title: string; content: string }>
    ) => {
      db.update(schema.worldNotes)
        .set({ ...data, updatedAt: now() })
        .where(eq(schema.worldNotes.id, id))
        .run()
      return { success: true }
    }
  )

  safeHandle(IPC.WORLD_NOTES_DELETE, async (_e, id: string) => {
    db.delete(schema.worldNotes).where(eq(schema.worldNotes.id, id)).run()
    return { success: true }
  })

  safeHandle(IPC.WORLD_NOTES_REORDER, async (_e, orderedIds: string[]) => {
    reorderByIds(schema.worldNotes, schema.worldNotes.id, schema.worldNotes.sortOrder, orderedIds)
    return { success: true }
  })
}
