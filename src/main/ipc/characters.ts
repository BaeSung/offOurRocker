import { randomUUID as uuid } from 'crypto'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, getNextSortOrder, reorderByIds, safeHandle } from './utils'

export function registerCharactersHandlers(): void {
  const db = getDb()

  safeHandle(IPC.CHARACTERS_GET_BY_WORK, async (_e, workId: string) => {
    return db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.workId, workId))
      .orderBy(asc(schema.characters.sortOrder))
      .all()
  })

  safeHandle(
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
      const ts = now()
      const id = uuid()
      const sortOrder = getNextSortOrder(
        schema.characters.sortOrder,
        schema.characters,
        schema.characters.workId,
        data.workId
      )

      db.insert(schema.characters)
        .values({
          id,
          workId: data.workId,
          name: data.name,
          role: data.role,
          description: data.description || null,
          sortOrder,
          createdAt: ts,
          updatedAt: ts,
        })
        .run()
      return { id }
    }
  )

  safeHandle(
    IPC.CHARACTERS_UPDATE,
    async (
      _e,
      id: string,
      data: Partial<{ name: string; role: string; description: string }>
    ) => {
      db.update(schema.characters)
        .set({ ...data, updatedAt: now() })
        .where(eq(schema.characters.id, id))
        .run()
      return { success: true }
    }
  )

  safeHandle(IPC.CHARACTERS_DELETE, async (_e, id: string) => {
    db.delete(schema.characters).where(eq(schema.characters.id, id)).run()
    return { success: true }
  })

  safeHandle(IPC.CHARACTERS_REORDER, async (_e, orderedIds: string[]) => {
    reorderByIds(schema.characters, schema.characters.id, schema.characters.sortOrder, orderedIds)
    return { success: true }
  })
}
