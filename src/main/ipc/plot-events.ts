import { randomUUID as uuid } from 'crypto'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { now, getNextSortOrder, reorderByIds, safeHandle } from './utils'

export function registerPlotEventsHandlers(): void {
  const db = getDb()

  safeHandle(IPC.PLOT_EVENTS_GET_BY_WORK, async (_e, workId: string) => {
    return db
      .select()
      .from(schema.plotEvents)
      .where(eq(schema.plotEvents.workId, workId))
      .orderBy(asc(schema.plotEvents.sortOrder))
      .all()
  })

  safeHandle(
    IPC.PLOT_EVENTS_CREATE,
    async (
      _e,
      data: {
        workId: string
        title: string
        description?: string
        color?: string
        chapterId?: string
      }
    ) => {
      const id = uuid()
      const ts = now()
      const sortOrder = getNextSortOrder(
        schema.plotEvents.sortOrder,
        schema.plotEvents,
        schema.plotEvents.workId,
        data.workId
      )

      db.insert(schema.plotEvents)
        .values({
          id,
          workId: data.workId,
          chapterId: data.chapterId ?? null,
          title: data.title,
          description: data.description ?? null,
          color: data.color ?? '#3b82f6',
          sortOrder,
          createdAt: ts,
          updatedAt: ts,
        })
        .run()

      return { id }
    }
  )

  safeHandle(
    IPC.PLOT_EVENTS_UPDATE,
    async (
      _e,
      id: string,
      data: Partial<{
        title: string
        description: string
        color: string
        chapterId: string | null
      }>
    ) => {
      db.update(schema.plotEvents)
        .set({ ...data, updatedAt: now() })
        .where(eq(schema.plotEvents.id, id))
        .run()
      return { success: true }
    }
  )

  safeHandle(IPC.PLOT_EVENTS_DELETE, async (_e, id: string) => {
    db.delete(schema.plotEvents).where(eq(schema.plotEvents.id, id)).run()
    return { success: true }
  })

  safeHandle(IPC.PLOT_EVENTS_REORDER, async (_e, orderedIds: string[]) => {
    reorderByIds(schema.plotEvents, schema.plotEvents.id, schema.plotEvents.sortOrder, orderedIds)
    return { success: true }
  })
}
