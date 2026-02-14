import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RecentWorks } from "@/components/dashboard/recent-works"
import { GenreChart } from "@/components/dashboard/genre-chart"
import { WritingCalendar } from "@/components/dashboard/writing-calendar"
import { GoalTracker } from "@/components/dashboard/goal-tracker"

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 6) return "고요한 밤이에요."
  if (h < 12) return "좋은 아침이에요."
  if (h < 18) return "좋은 오후예요."
  return "좋은 저녁이에요."
}

function getFormattedDate(): string {
  const d = new Date()
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`
}

export function DashboardPage() {
  const greeting = useMemo(() => getGreeting(), [])
  const dateStr = useMemo(() => getFormattedDate(), [])

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto max-w-[960px] px-12 py-10">
        {/* Welcome section */}
        <div
          className="mb-10 flex items-end justify-between"
          style={{
            opacity: 0,
            animation: "fadeSlideUp 500ms 0ms ease-out forwards",
          }}
        >
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">{greeting}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {"오늘도 한 줄의 문장이 세계를 만듭니다."}
            </p>
          </div>
          <time className="text-sm tabular-nums text-muted-foreground">{dateStr}</time>
        </div>

        {/* Summary cards */}
        <div className="mb-10">
          <SummaryCards />
        </div>

        {/* Recent works */}
        <div className="mb-10">
          <RecentWorks />
        </div>

        {/* Genre chart + Writing calendar (side by side) */}
        <div className="mb-10 grid grid-cols-2 gap-5">
          <GenreChart />
          <WritingCalendar />
        </div>

        {/* Goal tracker */}
        <div className="mb-10">
          <GoalTracker />
        </div>
      </div>
    </ScrollArea>
  )
}
