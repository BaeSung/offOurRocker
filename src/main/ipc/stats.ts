import { ipcMain } from 'electron'
import { eq, sql, desc, and, gte, lte, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerStatsHandlers(): void {
  const db = getDb()

  // Summary stats for dashboard
  ipcMain.handle(IPC.STATS_SUMMARY, async () => {
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

    // Weekly writing (last 7 days)
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

    // Build 7-day array
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

  // Recent works for dashboard
  ipcMain.handle(IPC.STATS_RECENT_WORKS, async () => {
    const recentWorks = db
      .select()
      .from(schema.works)
      .where(eq(schema.works.deleted, 0))
      .orderBy(desc(schema.works.updatedAt))
      .limit(3)
      .all()

    return recentWorks.map((w) => {
      // Get total char count for this work
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

  // Genre distribution
  ipcMain.handle(IPC.STATS_GENRE_DISTRIBUTION, async () => {
    const result = db
      .select({
        genre: schema.works.genre,
        count: sql<number>`count(*)`,
      })
      .from(schema.works)
      .where(eq(schema.works.deleted, 0))
      .groupBy(schema.works.genre)
      .all()
    return result
  })

  // Writing log by month
  ipcMain.handle(IPC.WRITING_LOG_GET_BY_MONTH, async (_e, year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endMonth = month === 12 ? 1 : month + 1
    const endYear = month === 12 ? year + 1 : year
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`

    const logs = db
      .select({
        date: schema.writingLog.date,
        total: sql<number>`sum(${schema.writingLog.charCount})`,
      })
      .from(schema.writingLog)
      .where(and(gte(schema.writingLog.date, startDate), lte(schema.writingLog.date, endDate)))
      .groupBy(schema.writingLog.date)
      .all()

    return logs
  })
}
