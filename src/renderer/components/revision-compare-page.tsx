import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Circle, Loader2 } from 'lucide-react'
import { diffWordsWithSpace, type Change } from 'diff'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import type { Revision, RevisionDiffResult } from '@/lib/electron'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CURRENT_SENTINEL = '__current__'

function formatRevisionLabel(r: { roundNumber: number; label: string | null; createdAt?: string } | null, fallback = '현재'): string {
  if (!r) return fallback
  const base = `${r.roundNumber}회차`
  return r.label ? `${base} · ${r.label}` : base
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

function DiffPart({ changes }: { changes: Change[] }) {
  return (
    <div className="whitespace-pre-wrap break-words font-serif text-sm leading-relaxed text-foreground">
      {changes.map((c, i) => {
        if (c.added) {
          return (
            <span key={i} className="bg-emerald-500/25 text-emerald-100 rounded px-0.5">
              {c.value}
            </span>
          )
        }
        if (c.removed) {
          return (
            <span key={i} className="bg-red-500/25 text-red-100 line-through rounded px-0.5">
              {c.value}
            </span>
          )
        }
        return <span key={i}>{c.value}</span>
      })}
    </div>
  )
}

export function RevisionComparePage() {
  const context = useAppStore((s) => s.revisionCompare)
  const close = useAppStore((s) => s.closeRevisionCompare)

  const [revisions, setRevisions] = useState<Revision[]>([])
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [diff, setDiff] = useState<RevisionDiffResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedChapterIdx, setSelectedChapterIdx] = useState(0)

  const workId = context?.workId ?? null

  // Load revisions list
  useEffect(() => {
    if (!workId) return
    window.api.revisions.list(workId).then(setRevisions).catch(() => setRevisions([]))
  }, [workId])

  // Default selection: if none given, use latest vs previous; if only latest exists, compare latest vs current
  useEffect(() => {
    if (!context) return
    if (context.fromId !== null || context.toId !== null) {
      setFromId(context.fromId)
      setToId(context.toId)
      return
    }
    if (revisions.length >= 2) {
      setFromId(revisions[1].id)
      setToId(revisions[0].id)
    } else if (revisions.length === 1) {
      setFromId(revisions[0].id)
      setToId(null)
    }
  }, [context, revisions])

  const loadDiff = useCallback(async () => {
    if (!workId) return
    setLoading(true)
    try {
      const result = await window.api.revisions.diff(workId, fromId, toId)
      setDiff(result)
      setSelectedChapterIdx(0)
    } finally {
      setLoading(false)
    }
  }, [workId, fromId, toId])

  useEffect(() => {
    if (workId) loadDiff()
  }, [workId, fromId, toId, loadDiff])

  const changedCount = useMemo(
    () => diff?.chapters.filter((c) => c.changed).length ?? 0,
    [diff]
  )

  const charDelta = useMemo(() => {
    if (!diff) return { added: 0, removed: 0 }
    let added = 0
    let removed = 0
    for (const c of diff.chapters) {
      const d = c.toCharCount - c.fromCharCount
      if (d > 0) added += d
      else removed += -d
    }
    return { added, removed }
  }, [diff])

  const selectedChapter = diff?.chapters[selectedChapterIdx]
  const diffChanges = useMemo<Change[]>(() => {
    if (!selectedChapter) return []
    const a = stripHtml(selectedChapter.fromContent ?? '')
    const b = stripHtml(selectedChapter.toContent ?? '')
    return diffWordsWithSpace(a, b)
  }, [selectedChapter])

  const options: { id: string; label: string }[] = useMemo(() => {
    const revOpts = revisions.map((r) => ({
      id: r.id,
      label: `${r.roundNumber}회차${r.label ? ` · ${r.label}` : ''}`,
    }))
    return [{ id: CURRENT_SENTINEL, label: '현재 (저장 안 됨)' }, ...revOpts]
  }, [revisions])

  if (!context || !workId) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        비교할 작품이 선택되지 않았습니다.
      </div>
    )
  }

  const valueFor = (id: string | null) => (id === null ? CURRENT_SENTINEL : id)
  const idFromValue = (v: string) => (v === CURRENT_SENTINEL ? null : v)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/50 px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={close} className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            편집기로
          </Button>
          <h1 className="font-serif text-lg font-bold text-foreground">회차 비교</h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Select value={valueFor(fromId)} onValueChange={(v) => setFromId(idFromValue(v))}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">→</span>
          <Select value={valueFor(toId)} onValueChange={(v) => setToId(idFromValue(v))}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-6 py-2 text-xs">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            비교 중...
          </div>
        ) : diff ? (
          <>
            <span className="text-muted-foreground">
              전체 {diff.chapters.length}개 챕터 중{' '}
              <span className="font-medium text-foreground">{changedCount}개</span> 수정
            </span>
            <span className="text-emerald-500">+{charDelta.added.toLocaleString()}자</span>
            <span className="text-red-500">−{charDelta.removed.toLocaleString()}자</span>
            <span className="ml-auto text-muted-foreground">
              {formatRevisionLabel(diff.from)} → {formatRevisionLabel(diff.to)}
            </span>
          </>
        ) : null}
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chapter list */}
        <aside className="w-[220px] shrink-0 overflow-y-auto border-r border-border bg-card/30 py-2">
          {diff?.chapters.map((ch, idx) => (
            <button
              key={`${ch.chapterId ?? ch.chapterTitle}-${idx}`}
              onClick={() => setSelectedChapterIdx(idx)}
              className={cn(
                'flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-xs transition-colors',
                idx === selectedChapterIdx
                  ? 'border-l-primary bg-secondary/70 text-foreground'
                  : 'border-l-transparent text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
              )}
            >
              <Circle
                className={cn(
                  'h-2 w-2 shrink-0',
                  ch.changed ? 'fill-amber-500 text-amber-500' : 'fill-transparent text-muted-foreground/40'
                )}
              />
              <span className="flex-1 truncate">{ch.chapterTitle}</span>
              {ch.changed && (
                <span className="text-[10px] text-muted-foreground">
                  {ch.toCharCount - ch.fromCharCount >= 0 ? '+' : ''}
                  {(ch.toCharCount - ch.fromCharCount).toLocaleString()}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* Diff viewer */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {!selectedChapter ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              비교할 챕터를 선택하세요.
            </div>
          ) : (
            <div className="mx-auto max-w-[880px]">
              <div className="mb-4">
                <h2 className="font-serif text-xl font-bold text-foreground">
                  {selectedChapter.chapterTitle}
                </h2>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{selectedChapter.fromCharCount.toLocaleString()}자</span>
                  <span>→</span>
                  <span>{selectedChapter.toCharCount.toLocaleString()}자</span>
                  {!selectedChapter.changed && (
                    <span className="ml-2 rounded bg-muted px-2 py-0.5">변경 없음</span>
                  )}
                </div>
              </div>
              {selectedChapter.fromContent === null ? (
                <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                  이 챕터는 이전 회차에 없던 새 챕터입니다.
                </p>
              ) : selectedChapter.toContent === null ? (
                <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  이 챕터는 이후 회차에서 삭제되었습니다.
                </p>
              ) : null}
              <div className="mt-4 rounded-md border border-border bg-background p-6">
                <DiffPart changes={diffChanges} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
