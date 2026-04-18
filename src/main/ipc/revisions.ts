import { randomUUID as uuid } from 'crypto'
import { eq, desc, asc, sql } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb, getSqlite } from '../db/connection'
import * as schema from '../db/schema'
import { now, safeHandle } from './utils'

export function registerRevisionsHandlers(): void {
  const db = getDb()

  safeHandle(IPC.REVISIONS_LIST, async (_e, workId: string) => {
    return db
      .select({
        id: schema.revisions.id,
        workId: schema.revisions.workId,
        roundNumber: schema.revisions.roundNumber,
        label: schema.revisions.label,
        note: schema.revisions.note,
        totalCharCount: schema.revisions.totalCharCount,
        createdAt: schema.revisions.createdAt,
      })
      .from(schema.revisions)
      .where(eq(schema.revisions.workId, workId))
      .orderBy(desc(schema.revisions.roundNumber))
      .all()
  })

  safeHandle(
    IPC.REVISIONS_CREATE,
    async (_e, workId: string, options?: { label?: string; note?: string }) => {
      const chapters = db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.workId, workId))
        .orderBy(asc(schema.chapters.sortOrder))
        .all()

      if (chapters.length === 0) {
        return { success: false, error: '챕터가 없어 회차를 저장할 수 없습니다.' }
      }

      const maxRow = db
        .select({ max: sql<number>`coalesce(max(${schema.revisions.roundNumber}), 0)` })
        .from(schema.revisions)
        .where(eq(schema.revisions.workId, workId))
        .get()
      const roundNumber = (maxRow?.max ?? 0) + 1

      const revisionId = uuid()
      const ts = now()

      const sqlite = getSqlite()
      const totalChars = chapters.reduce((sum, c) => sum + (c.charCount || 0), 0)

      const tx = sqlite.transaction(() => {
        db.insert(schema.revisions)
          .values({
            id: revisionId,
            workId,
            roundNumber,
            label: options?.label || null,
            note: options?.note || null,
            totalCharCount: totalChars,
            createdAt: ts,
          })
          .run()

        for (const ch of chapters) {
          db.insert(schema.revisionChapters)
            .values({
              id: uuid(),
              revisionId,
              chapterId: ch.id,
              chapterTitle: ch.title,
              chapterSortOrder: ch.sortOrder,
              content: ch.content || '',
              charCount: ch.charCount || 0,
            })
            .run()
        }
      })
      tx()

      return { success: true, id: revisionId, roundNumber }
    }
  )

  safeHandle(IPC.REVISIONS_DELETE, async (_e, revisionId: string) => {
    db.delete(schema.revisions).where(eq(schema.revisions.id, revisionId)).run()
    return { success: true }
  })

  safeHandle(
    IPC.REVISIONS_UPDATE,
    async (_e, revisionId: string, data: { label?: string | null; note?: string | null }) => {
      const patch: { label?: string | null; note?: string | null } = {}
      if (data.label !== undefined) patch.label = data.label
      if (data.note !== undefined) patch.note = data.note
      if (Object.keys(patch).length > 0) {
        db.update(schema.revisions).set(patch).where(eq(schema.revisions.id, revisionId)).run()
      }
      return { success: true }
    }
  )

  // Returns per-chapter snapshots for two revisions (or one vs current work state).
  // fromId can be null → compare against current work content.
  safeHandle(
    IPC.REVISIONS_DIFF,
    async (_e, workId: string, fromId: string | null, toId: string | null) => {
      const loadRevision = (id: string) => {
        const rev = db
          .select()
          .from(schema.revisions)
          .where(eq(schema.revisions.id, id))
          .get()
        if (!rev) return null
        const snaps = db
          .select()
          .from(schema.revisionChapters)
          .where(eq(schema.revisionChapters.revisionId, id))
          .orderBy(asc(schema.revisionChapters.chapterSortOrder))
          .all()
        return { rev, snaps }
      }

      const loadCurrent = () => {
        const chapters = db
          .select()
          .from(schema.chapters)
          .where(eq(schema.chapters.workId, workId))
          .orderBy(asc(schema.chapters.sortOrder))
          .all()
        return chapters.map((c) => ({
          id: c.id,
          revisionId: '__current__',
          chapterId: c.id,
          chapterTitle: c.title,
          chapterSortOrder: c.sortOrder,
          content: c.content || '',
          charCount: c.charCount || 0,
        }))
      }

      const from = fromId ? loadRevision(fromId) : null
      const to = toId ? loadRevision(toId) : null
      const fromSnaps = from ? from.snaps : loadCurrent()
      const toSnaps = to ? to.snaps : loadCurrent()

      // Group by chapterId (fall back to chapterTitle if chapter was deleted)
      type Snap = typeof fromSnaps[number]
      const key = (s: Snap) => s.chapterId || `title:${s.chapterTitle}`
      const fromMap = new Map<string, Snap>()
      const toMap = new Map<string, Snap>()
      for (const s of fromSnaps) fromMap.set(key(s), s)
      for (const s of toSnaps) toMap.set(key(s), s)

      const allKeys = new Set<string>([...fromMap.keys(), ...toMap.keys()])
      const ordered: Array<{
        chapterId: string | null
        chapterTitle: string
        sortOrder: number
        fromContent: string | null
        toContent: string | null
        fromCharCount: number
        toCharCount: number
        changed: boolean
      }> = []

      for (const k of allKeys) {
        const f = fromMap.get(k)
        const t = toMap.get(k)
        const title = t?.chapterTitle || f?.chapterTitle || '(제목 없음)'
        const sortOrder = t?.chapterSortOrder ?? f?.chapterSortOrder ?? 0
        const fromContent = f ? f.content : null
        const toContent = t ? t.content : null
        const changed = fromContent !== toContent
        ordered.push({
          chapterId: (t?.chapterId ?? f?.chapterId) || null,
          chapterTitle: title,
          sortOrder,
          fromContent,
          toContent,
          fromCharCount: f?.charCount ?? 0,
          toCharCount: t?.charCount ?? 0,
          changed,
        })
      }

      ordered.sort((a, b) => a.sortOrder - b.sortOrder)

      return {
        success: true,
        from: from
          ? { id: from.rev.id, roundNumber: from.rev.roundNumber, label: from.rev.label, createdAt: from.rev.createdAt }
          : null,
        to: to
          ? { id: to.rev.id, roundNumber: to.rev.roundNumber, label: to.rev.label, createdAt: to.rev.createdAt }
          : null,
        chapters: ordered,
      }
    }
  )
}
