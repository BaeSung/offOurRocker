import { useState, useEffect } from "react"
import { BookOpen, PenLine, Type, TrendingUp } from "lucide-react"
import { useCountUp } from "@/hooks/use-count-up"

function MiniBarChart({ data }: { data: number[] }) {
  const maxVal = Math.max(...data, 1)
  const today = new Date().getDay()
  const todayIndex = today === 0 ? 6 : today - 1

  return (
    <div className="flex items-end gap-1 h-6">
      {data.map((value, i) => {
        const h = value > 0 ? Math.max((value / maxVal) * 100, 12) : 4
        const isFuture = i > todayIndex
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="w-3 rounded-sm transition-all duration-500"
              style={{
                height: `${h}%`,
                minHeight: value > 0 ? 3 : 1,
                background: isFuture
                  ? "hsl(var(--border))"
                  : value > 0
                  ? `hsl(30 ${40 + (h / 100) * 30}% ${50 + (h / 100) * 20}%)`
                  : "hsl(var(--border))",
                animationDelay: `${i * 80}ms`,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

interface SummaryCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  formatted?: string
  sub: React.ReactNode
  delay: number
  dotColor?: string
}

function SummaryCard({ icon: Icon, label, value, formatted, sub, delay, dotColor }: SummaryCardProps) {
  const count = useCountUp(value, 600, delay)

  const displayValue = formatted
    ? formatted.replace(String(value), count.toLocaleString())
    : count.toLocaleString()

  return (
    <div
      className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.06)]"
      style={{
        opacity: 0,
        animation: `fadeSlideUp 400ms ${delay}ms ease-out forwards`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {dotColor && (
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
          )}
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className="text-3xl font-bold tracking-tight text-foreground">{displayValue}</p>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </div>
  )
}

export function SummaryCards() {
  const [data, setData] = useState<{
    totalWorks: number
    writingWorks: number
    totalChars: number
    weeklyData: number[]
  } | null>(null)

  useEffect(() => {
    window.api.stats.summary().then(setData).catch(console.error)
  }, [])

  if (!data) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[140px] rounded-xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    )
  }

  const weeklyTotal = data.weeklyData.reduce((a, b) => a + b, 0)
  const manuscriptPages = Math.round(data.totalChars / 200)

  return (
    <div className="grid grid-cols-4 gap-4">
      <SummaryCard
        icon={BookOpen}
        label="전체 작품"
        value={data.totalWorks}
        delay={0}
        sub={<span>{data.totalWorks}편</span>}
      />
      <SummaryCard
        icon={PenLine}
        label="집필 중"
        value={data.writingWorks}
        delay={100}
        dotColor="bg-blue-500"
        sub={<span>{data.writingWorks}편 집필중</span>}
      />
      <SummaryCard
        icon={Type}
        label="총 글자수"
        value={data.totalChars}
        formatted={data.totalChars.toLocaleString()}
        delay={200}
        sub={<span>원고지 약 {manuscriptPages}매</span>}
      />
      <SummaryCard
        icon={TrendingUp}
        label="이번 주 집필량"
        value={weeklyTotal}
        formatted={weeklyTotal.toLocaleString()}
        delay={300}
        sub={<MiniBarChart data={data.weeklyData} />}
      />
    </div>
  )
}
