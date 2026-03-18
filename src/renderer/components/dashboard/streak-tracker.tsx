import { useState, useEffect } from 'react'
import { Flame, Trophy } from 'lucide-react'

export function StreakTracker() {
  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null)

  useEffect(() => {
    window.api.analytics.streak().then(setStreak).catch(() => {})
  }, [])

  if (!streak) {
    return (
      <div
        className="h-[120px] rounded-xl border border-border bg-card animate-pulse"
        style={{
          opacity: 0,
          animation: 'fadeSlideUp 400ms 1000ms ease-out forwards',
        }}
      />
    )
  }

  return (
    <section
      style={{
        opacity: 0,
        animation: 'fadeSlideUp 400ms 1000ms ease-out forwards',
      }}
    >
      <h2 className="mb-4 font-sans text-lg font-semibold text-foreground">연속 집필</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <Flame className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {streak.current}
              <span className="ml-1 text-sm font-normal text-muted-foreground">일</span>
            </p>
            <p className="text-[11px] text-muted-foreground">현재 스트릭</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {streak.longest}
              <span className="ml-1 text-sm font-normal text-muted-foreground">일</span>
            </p>
            <p className="text-[11px] text-muted-foreground">최장 스트릭</p>
          </div>
        </div>
      </div>
    </section>
  )
}
