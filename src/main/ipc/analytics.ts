import { sql, eq, and, gte, lte, desc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { safeHandle, localDateStr } from './utils'

export function registerAnalyticsHandlers(): void {
  const db = getDb()

  safeHandle(IPC.ANALYTICS_WEEKLY_TREND, async () => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 6)
    const startStr = localDateStr(weekAgo)

    const logs = db
      .select({
        date: schema.writingLog.date,
        total: sql<number>`sum(${schema.writingLog.charCount})`,
      })
      .from(schema.writingLog)
      .where(gte(schema.writingLog.date, startStr))
      .groupBy(schema.writingLog.date)
      .all()

    const logMap = new Map(logs.map((l) => [l.date, l.total]))
    const days: { week: string; chars: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = localDateStr(d)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      days.push({ week: label, chars: logMap.get(dateStr) ?? 0 })
    }

    return days
  })

  safeHandle(IPC.ANALYTICS_MONTHLY_TREND, async () => {
    const today = new Date()
    const months: { month: string; chars: number }[] = []

    for (let m = 5; m >= 0; m--) {
      const d = new Date(today.getFullYear(), today.getMonth() - m, 1)
      const startDate = localDateStr(d)
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const endDate = localDateStr(nextMonth)

      const result = db
        .select({
          total: sql<number>`coalesce(sum(${schema.writingLog.charCount}), 0)`,
        })
        .from(schema.writingLog)
        .where(and(gte(schema.writingLog.date, startDate), lte(schema.writingLog.date, endDate)))
        .get()

      const label = `${d.getMonth() + 1}월`
      months.push({ month: label, chars: result?.total ?? 0 })
    }

    return months
  })

  safeHandle(IPC.ANALYTICS_STREAK, async () => {
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

    const todayStr = localDateStr()
    const yesterdayStr = localDateStr(new Date(Date.now() - 86400000))

    let current = 0
    const dateSet = new Set(allDates)

    let checkDate: Date
    if (dateSet.has(todayStr)) {
      checkDate = new Date()
    } else if (dateSet.has(yesterdayStr)) {
      checkDate = new Date(Date.now() - 86400000)
    } else {
      current = 0
      checkDate = new Date(0)
    }

    if (checkDate.getTime() > 0) {
      while (dateSet.has(localDateStr(checkDate))) {
        current++
        checkDate.setDate(checkDate.getDate() - 1)
      }
    }

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

  safeHandle(IPC.ANALYTICS_WORK_DISTRIBUTION, async () => {
    const charsExpr = sql<number>`coalesce(sum(${schema.chapters.charCount}), 0)`
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
