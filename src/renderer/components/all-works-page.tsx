import { useState, useEffect, useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/stores/useAppStore"
import { GENRE_CONFIG } from '../../shared/types'
import type { Work } from '../../shared/types'
import { ArrowLeft, Search } from 'lucide-react'
import { CoverArea } from '@/components/dashboard/recent-works'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  writing: { label: '집필중', color: 'bg-blue-500' },
  editing: { label: '퇴고중', color: 'bg-amber-500' },
  complete: { label: '완료', color: 'bg-emerald-500' },
}

type SortKey = 'updatedAt' | 'title' | 'charCount'
type FilterGenre = 'all' | string
type FilterStatus = 'all' | 'writing' | 'editing' | 'complete'

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return date.toLocaleDateString('ko-KR')
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min((current / target) * 100, 100)
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {current.toLocaleString()} / {target.toLocaleString()}자
      </span>
    </div>
  )
}

export function AllWorksPage() {
  const [works, setWorks] = useState<(Work & { charCount: number })[]>([])
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [filterGenre, setFilterGenre] = useState<FilterGenre>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const setView = useAppStore((s) => s.setView)
  const setActiveDocument = useAppStore((s) => s.setActiveDocument)

  useEffect(() => {
    let cancelled = false
    window.api.stats.allWorks()
      .then((data) => { if (!cancelled) setWorks(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const genres = useMemo(() => {
    const set = new Set(works.map((w) => w.genre))
    return Array.from(set)
  }, [works])

  const filtered = useMemo(() => {
    let result = [...works]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter((w) => w.title.toLowerCase().includes(q))
    }
    if (filterGenre !== 'all') {
      result = result.filter((w) => w.genre === filterGenre)
    }
    if (filterStatus !== 'all') {
      result = result.filter((w) => w.status === filterStatus)
    }

    result.sort((a, b) => {
      if (sortKey === 'updatedAt') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      if (sortKey === 'title') return a.title.localeCompare(b.title, 'ko')
      return b.charCount - a.charCount
    })

    return result
  }, [works, search, sortKey, filterGenre, filterStatus])

  const handleCoverChange = (workId: string, coverImage: string | null) => {
    setWorks((prev) => prev.map((w) => w.id === workId ? { ...w, coverImage } : w))
  }

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-[960px] px-6 md:px-12 py-10">
        {/* Header */}
        <div
          className="mb-8 flex items-center gap-3"
          style={{ opacity: 0, animation: "fadeSlideUp 500ms 0ms ease-out forwards" }}
        >
          <button
            onClick={() => setView('dashboard')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="font-serif text-2xl font-bold text-foreground">모든 작품</h1>
            <p className="text-sm text-muted-foreground">{works.length}개의 작품</p>
          </div>
        </div>

        {/* Filters */}
        <div
          className="mb-6 flex flex-wrap items-center gap-3"
          style={{ opacity: 0, animation: "fadeSlideUp 500ms 100ms ease-out forwards" }}
        >
          <div className="relative flex-1 min-w-[200px] max-w-[320px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="작품 검색..."
              className="h-8 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
            />
          </div>
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            className="h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="all">전체 장르</option>
            {genres.map((g) => (
              <option key={g} value={g}>{GENRE_CONFIG[g]?.label || g}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="all">전체 상태</option>
            <option value="writing">집필중</option>
            <option value="editing">퇴고중</option>
            <option value="complete">완료</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none focus:border-primary"
          >
            <option value="updatedAt">최근 수정순</option>
            <option value="title">제목순</option>
            <option value="charCount">글자수순</option>
          </select>
        </div>

        {/* Works grid */}
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {works.length === 0 ? '아직 작품이 없습니다.' : '검색 결과가 없습니다.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((work, i) => {
              const genreConf = GENRE_CONFIG[work.genre] || GENRE_CONFIG.other
              const statusConf = STATUS_LABELS[work.status] || STATUS_LABELS.writing

              return (
                <div
                  key={work.id}
                  className="group flex flex-row rounded-xl border border-border bg-card overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                  style={{
                    opacity: 0,
                    animation: `fadeSlideUp 400ms ${200 + i * 50}ms ease-out forwards`,
                  }}
                >
                  <CoverArea work={work} onCoverChange={(img) => handleCoverChange(work.id, img)} />

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-1.5 p-3.5 min-w-0">
                    <h3 className="truncate font-serif text-sm font-bold text-foreground">{work.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                        {genreConf.label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusConf.color}`} />
                        {statusConf.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      마지막 편집: {formatRelativeTime(work.updatedAt)}
                    </p>
                    {work.goalChars ? (
                      <ProgressBar current={work.charCount} target={work.goalChars} />
                    ) : (
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        {work.charCount.toLocaleString()}자
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto w-full text-xs h-7 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => setActiveDocument(work.id, null)}
                    >
                      이어쓰기
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
