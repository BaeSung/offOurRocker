import { ipcMain } from 'electron'
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'

export function registerAnalyticsHandlers(): void {
  const db = getDb()

  // Weekly trend: last 4 weeks, grouped by week
  ipcMain.handle(IPC.ANALYTICS_WEEKLY_TREND, async () => {
    const today = new Date()
    const fourWeeksAgo = new Date(today)
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 27) // 4 weeks = 28 days
    const startStr = fourWeeksAgo.toISOString().slice(0, 10)

    const logs = db
      .select({
        date: schema.writingLog.date,
        total: sql<number>`sum(${schema.writingLog.charCount})`,
      })
      .from(schema.writingLog)
      .where(gte(schema.writingLog.date, startStr))
      .groupBy(schema.writingLog.date)
      .all()

    // Group into 4 weeks
    const weeks: { week: string; chars: number }[] = []
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - w * 7 - 6)
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() - w * 7)

      const startD = weekStart.toISOString().slice(0, 10)
      const endD = weekEnd.toISOString().slice(0, 10)

      let total = 0
      for (const log of logs) {
        if (log.date >= startD && log.date <= endD) {
          total += log.total
        }
      }

      const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
      weeks.push({ week: label, chars: total })
    }

    return weeks
  })

  // Monthly trend: last 6 months
  ipcMain.handle(IPC.ANALYTICS_MONTHLY_TREND, async () => {
    const today = new Date()
    const months: { month: string; chars: number }[] = []

    for (let m = 5; m >= 0; m--) {
      const d = new Date(today.getFullYear(), today.getMonth() - m, 1)
      const startDate = d.toISOString().slice(0, 10)
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const endDate = nextMonth.toISOString().slice(0, 10)

      const result = db
        .select({
          total: sql<number>`coalesce(sum(${schema.writingLog.charCount}), 0)`,
        })
        .from(schema.writingLog)
        .where(
          and(
            gte(schema.writingLog.date, startDate),
            lte(schema.writingLog.date, endDate)
          )
        )
        .get()

      const label = `${d.getMonth() + 1}월`
      months.push({ month: label, chars: result?.total ?? 0 })
    }

    return months
  })

  // Current streak + longest streak
  ipcMain.handle(IPC.ANALYTICS_STREAK, async () => {
    const allDates = db
      .select({ date: schema.writingLog.date })
      .from(schema.writingLog)
      .groupBy(schema.writingLog.date)
      .orderBy(desc(schema.writingLog.date))
      .all()
      .map((r) => r.date)

    if (allDates.length === 0) {
      return { current: 0, longest: 0 }
    }

    // Current streak: starting from today/yesterday, count consecutive days
    const todayStr = new Date().toISOString().slice(0, 10)
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    let current = 0
    const dateSet = new Set(allDates)

    // Check if streak includes today or yesterday
    let checkDate: Date
    if (dateSet.has(todayStr)) {
      checkDate = new Date()
    } else if (dateSet.has(yesterdayStr)) {
      checkDate = new Date(Date.now() - 86400000)
    } else {
      // No active streak
      current = 0
      checkDate = new Date(0)
    }

    if (checkDate.getTime() > 0) {
      while (dateSet.has(checkDate.toISOString().slice(0, 10))) {
        current++
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }

    // Longest streak
    let longest = 0
    let streak = 1
    for (let i = 0; i < allDates.length - 1; i++) {
      const curr = new Date(allDates[i])
      const next = new Date(allDates[i + 1])
      const diff = (curr.getTime() - next.getTime()) / 86400000

      if (Math.abs(diff - 1) < 0.01) {
        streak++
      } else {
        longest = Math.max(longest, streak)
        streak = 1
      }
    }
    longest = Math.max(longest, streak)

    return { current, longest }
  })

  // Work distribution: chars per work
  ipcMain.handle(IPC.ANALYTICS_WORK_DISTRIBUTION, async () => {
    const charsExpr = sql<number>`coalesce(sum(length(replace(${schema.chapters.content}, ' ', ''))), 0)`
    const worksWithChars = db
      .select({
        id: schema.works.id,
        title: schema.works.title,
        chars: charsExpr,
      })
      .from(schema.works)
      .leftJoin(schema.chapters, eq(schema.works.id, schema.chapters.workId))
      .where(eq(schema.works.deleted, 0))
      .groupBy(schema.works.id)
      .orderBy(desc(charsExpr))
      .limit(8)
      .all()

    return worksWithChars.map((w) => ({
      title: w.title,
      chars: w.chars,
    }))
  })
}
