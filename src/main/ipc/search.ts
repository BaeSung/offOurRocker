import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { like, eq, and, or } from 'drizzle-orm'
import { safeHandle } from './utils'

export interface SearchResult {
  type: 'work' | 'chapter'
  workId: string
  workTitle: string
  chapterId: string | null
  chapterTitle: string | null
  snippet: string
}

export function registerSearchHandlers(): void {
  const db = getDb()

  safeHandle(IPC.SEARCH_QUERY, async (_e, query: string): Promise<SearchResult[]> => {
    if (!query || query.trim().length === 0) return []

    const term = `%${query.trim()}%`
    const results: SearchResult[] = []

    const workMatches = db
      .select({
        id: schema.works.id,
        title: schema.works.title,
      })
      .from(schema.works)
      .where(and(like(schema.works.title, term), eq(schema.works.deleted, 0)))
      .limit(10)
      .all()

    for (const w of workMatches) {
      results.push({
        type: 'work',
        workId: w.id,
        workTitle: w.title,
        chapterId: null,
        chapterTitle: null,
        snippet: w.title,
      })
    }

    const chapterMatches = db
      .select({
        chapterId: schema.chapters.id,
        chapterTitle: schema.chapters.title,
        content: schema.chapters.content,
        workId: schema.chapters.workId,
        workTitle: schema.works.title,
      })
      .from(schema.chapters)
      .innerJoin(schema.works, eq(schema.chapters.workId, schema.works.id))
      .where(
        and(
          eq(schema.works.deleted, 0),
          or(
            like(schema.chapters.title, term),
            like(schema.chapters.content, term)
          )
        )
      )
      .limit(20)
      .all()

    for (const c of chapterMatches) {
      let snippet = ''
      const plainContent = (c.content || '').replace(/<[^>]*>/g, '')
      const idx = plainContent.toLowerCase().indexOf(query.toLowerCase())
      if (idx >= 0) {
        const start = Math.max(0, idx - 30)
        const end = Math.min(plainContent.length, idx + query.length + 50)
        snippet = (start > 0 ? '...' : '') + plainContent.slice(start, end) + (end < plainContent.length ? '...' : '')
      } else {
        snippet = c.chapterTitle
      }

      const displayTitle = c.chapterTitle === '__body__' ? null : c.chapterTitle

      results.push({
        type: 'chapter',
        workId: c.workId,
        workTitle: c.workTitle || '',
        chapterId: c.chapterId,
        chapterTitle: displayTitle,
        snippet,
      })
    }

    return results
  })
}
