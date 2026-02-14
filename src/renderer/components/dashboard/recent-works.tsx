import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/stores/useAppStore"
import { GENRE_CONFIG } from '../../../shared/types'
import type { Work } from '../../../shared/types'

const GENRE_GRADIENTS: Record<string, string> = {
  horror: "from-indigo-950 via-purple-950 to-slate-900",
  sf: "from-cyan-950 via-teal-950 to-slate-900",
  literary: "from-amber-950 via-orange-950 to-stone-900",
  fantasy: "from-violet-950 via-indigo-950 to-slate-900",
  other: "from-neutral-950 via-stone-950 to-slate-900",
}

const GENRE_ICONS: Record<string, string> = {
  horror: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-10h2v8h-2V7z",
  sf: "M12 2L2 19h20L12 2zm0 3l7.5 12h-15L12 5z",
  literary: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
  fantasy: "M12 2L2 19h20L12 2zm0 3l7.5 12h-15L12 5z",
  other: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  writing: { label: '집필중', color: 'bg-blue-500' },
  editing: { label: '퇴고중', color: 'bg-amber-500' },
  complete: { label: '완료', color: 'bg-emerald-500' },
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = Math.min((current / target) * 100, 100)
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{
            width: `${pct}%`,
            animation: "progressGrow 500ms ease-out forwards",
          }}
        />
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
        {current.toLocaleString()} / {target.toLocaleString()}자
      </span>
    </div>
  )
}

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

export function RecentWorks() {
  const [works, setWorks] = useState<(Work & { charCount: number })[]>([])
  const setActiveDocument = useAppStore((s) => s.setActiveDocument)

  useEffect(() => {
    window.api.stats.recentWorks().then(setWorks).catch(console.error)
  }, [])

  const handleContinue = (work: Work) => {
    setActiveDocument(work.id, null)
  }

  if (works.length === 0) {
    return (
      <section>
        <h2 className="mb-4 font-sans text-lg font-semibold text-foreground">최근 작업</h2>
        <p className="text-sm text-muted-foreground">최근 작업한 작품이 없습니다.</p>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-lg font-semibold text-foreground">최근 작업</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {works.map((work, i) => {
          const genreConf = GENRE_CONFIG[work.genre] || GENRE_CONFIG.other
          const statusConf = STATUS_LABELS[work.status] || STATUS_LABELS.writing

          return (
            <div
              key={work.id}
              className="group flex flex-row rounded-xl border border-border bg-card overflow-hidden transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
              style={{
                opacity: 0,
                animation: `fadeSlideUp 400ms ${400 + i * 100}ms ease-out forwards`,
              }}
            >
              {/* Genre art banner (left) */}
              <div
                className={`flex w-28 shrink-0 items-center justify-center bg-gradient-to-br ${GENRE_GRADIENTS[work.genre] || GENRE_GRADIENTS.other}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8 text-foreground/15"
                  fill="currentColor"
                >
                  <path d={GENRE_ICONS[work.genre] || GENRE_ICONS.other} />
                </svg>
              </div>

              {/* Info (right) */}
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
                  onClick={() => handleContinue(work)}
                >
                  이어쓰기
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
