import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type TrendMode = 'weekly' | 'monthly'

export function WritingTrends() {
  const [mode, setMode] = useState<TrendMode>('weekly')
  const [weeklyData, setWeeklyData] = useState<{ week: string; chars: number }[]>([])
  const [monthlyData, setMonthlyData] = useState<{ month: string; chars: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      window.api.analytics.weeklyTrend(),
      window.api.analytics.monthlyTrend(),
    ])
      .then(([w, m]) => {
        setWeeklyData(w)
        setMonthlyData(m)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const data = mode === 'weekly' ? weeklyData : monthlyData
  const nameKey = mode === 'weekly' ? 'week' : 'month'

  return (
    <section
      style={{
        opacity: 0,
        animation: 'fadeSlideUp 400ms 900ms ease-out forwards',
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-lg font-semibold text-foreground">집필 트렌드</h2>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setMode('weekly')}
            className={
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' +
              (mode === 'weekly'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            주간
          </button>
          <button
            onClick={() => setMode('monthly')}
            className={
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' +
              (mode === 'monthly'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            월간
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        {loading ? (
          <div className="h-[200px] animate-pulse rounded-lg bg-secondary/30" />
        ) : data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            집필 기록이 아직 없습니다.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey={nameKey}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 10000 ? `${(v / 10000).toFixed(1)}만` : v.toLocaleString()
                }
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  `${value.toLocaleString()}자`,
                  '집필량',
                ]}
              />
              <Line
                type="monotone"
                dataKey="chars"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
