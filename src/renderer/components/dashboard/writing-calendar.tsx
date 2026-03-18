import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function getIntensity(count: number): string {
  if (count === 0) return "bg-transparent"
  if (count <= 500) return "bg-primary/10"
  if (count <= 1000) return "bg-primary/30"
  if (count <= 2000) return "bg-primary/50"
  return "bg-primary/80"
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"]

const LEGEND = [
  { label: "0자", cls: "bg-secondary/50" },
  { label: "~500", cls: "bg-primary/10" },
  { label: "~1000", cls: "bg-primary/30" },
  { label: "~2000", cls: "bg-primary/50" },
  { label: "2000+", cls: "bg-primary/80" },
]

export function WritingCalendar() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [dailyCounts, setDailyCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    window.api.writingLog
      .getByMonth(year, month)
      .then((data) => {
        const map: Record<string, number> = {}
        for (const entry of data) {
          map[entry.date] = entry.total
        }
        setDailyCounts(map)
      })
      .catch(() => {})
  }, [year, month])

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const today = isCurrentMonth ? now.getDate() : daysInMonth

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const handlePrev = () => {
    if (month === 1) {
      setYear(year - 1)
      setMonth(12)
    } else {
      setMonth(month - 1)
    }
  }

  const handleNext = () => {
    if (month === 12) {
      setYear(year + 1)
      setMonth(1)
    } else {
      setMonth(month + 1)
    }
  }

  return (
    <section
      style={{
        opacity: 0,
        animation: "fadeSlideUp 400ms 950ms ease-out forwards",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-lg font-semibold text-foreground">집필 기록</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-foreground">{year}년 {month}월</span>
          <button
            onClick={handleNext}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-2">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square rounded-md" />
            }
            const key = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
            const count = dailyCounts[key] ?? 0
            const isToday = isCurrentMonth && day === now.getDate()
            const isFuture = isCurrentMonth && day > now.getDate()
            const cellDelay = 1000 + (i * 20)

            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div
                    className={`relative flex aspect-square items-center justify-center rounded-md text-xs tabular-nums transition-colors
                      ${isFuture ? "bg-transparent text-muted-foreground/30" : getIntensity(count)}
                      ${isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""}
                      ${!isFuture && count > 0 ? "text-foreground" : "text-muted-foreground/60"}
                    `}
                    style={{
                      opacity: 0,
                      animation: `fadeIn 200ms ${cellDelay}ms ease-out forwards`,
                    }}
                  >
                    {day}
                  </div>
                </TooltipTrigger>
                {!isFuture && (
                  <TooltipContent side="top" className="text-xs">
                    {month}월 {day}일: {count > 0 ? `${count.toLocaleString()}자 집필` : "집필 없음"}
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-3">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded-sm ${l.cls} border border-border/30`} />
              <span className="text-[10px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
