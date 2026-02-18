import { eq, sql, and, gte, lte, asc, desc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { safeHandle } from './utils'

export function registerStatsHandlers(): void {
  const db = getDb()

  safeHandle(IPC.STATS_SUMMARY, async () => {
    const totalWorks = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.works)
      .where(eq(schema.works.deleted, 0))
      .get()

    const writingWorks = db
      .select({ count: sql<number>`count(*)` })
      .from(schema.works)
      .where(and(eq(schema.works.deleted, 0), eq(schema.works.status, 'writing')))
      .get()

    const totalChars = db
      .select({ total: sql<number>`coalesce(sum(length(replace(${schema.chapters.content}, ' ', ''))), 0)` })
      .from(schema.chapters)
      .get()

    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 6)
    const weekAgoStr = weekAgo.toISOString().slice(0, 10)

    const weeklyLogs = db
      .select({
        date: schema.writingLog.date,
        total: sql<number>`sum(${schema.writingLog.charCount})`,
      })
      .from(schema.writingLog)
      .where(gte(schema.writingLog.date, weekAgoStr))
      .groupBy(schema.writingLog.date)
      .all()

    const weeklyData: number[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const log = weeklyLogs.find((l) => l.date === dateStr)
      weeklyData.push(log?.total ?? 0)
    }

    return {
      totalWorks: totalWorks?.count ?? 0,
      writingWorks: writingWorks?.count ?? 0,
      totalChars: totalChars?.total ?? 0,
      weeklyData,
    }
  })

  safeHandle(IPC.STATS_RECENT_WORKS, async () => {
    const recentWorks = db
      .select()
      .from(schema.works)
      .where(eq(schema.works.deleted, 0))
      .orderBy(desc(schema.works.updatedAt))
      .limit(3)
      .all()

    return recentWorks.map((w) => {
      const chars = db
        .select({ total: sql<number>`coalesce(sum(length(replace(${schema.chapters.content}, ' ', ''))), 0)` })
        .from(schema.chapters)
        .where(eq(schema.chapters.workId, w.id))
        .get()

      return {
        ...w,
        tags: JSON.parse(w.tags),
        charCount: chars?.total ?? 0,
      }
    })
  })

  safeHandle(IPC.STATS_GENRE_DISTRIBUTION, async () => {
    return db
      .select({
        genre: schema.works.genre,
        count: sql<number>`count(*)`,
      })
      .from(schema.works)
      .where(eq(schema.works.deleted, 0))
      .groupBy(schema.works.genre)
      .all()
  })

  safeHandle(IPC.WRITING_LOG_GET_BY_MONTH, async (_e, year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

    return db
      .select({
        date: schema.writingLog.date,
        total: sql<number>`sum(${schema.writingLog.charCount})`,
      })
      .from(schema.writingLog)
      .where(and(gte(schema.writingLog.date, startDate), lte(schema.writingLog.date, endDate)))
      .groupBy(schema.writingLog.date)
      .all()
  })
}
