import { useState, useEffect } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function WorkDistribution() {
  const [data, setData] = useState<{ title: string; chars: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.analytics
      .workDistribution()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section
      style={{
        opacity: 0,
        animation: 'fadeSlideUp 400ms 1100ms ease-out forwards',
      }}
    >
      <h2 className="mb-4 font-sans text-lg font-semibold text-foreground">작품별 집필량</h2>
      <div className="rounded-xl border border-border bg-card p-6">
        {loading ? (
          <div className="h-[200px] animate-pulse rounded-lg bg-secondary/30" />
        ) : data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            작품을 추가하면 집필량 분포가 표시됩니다.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 10000 ? `${(v / 10000).toFixed(1)}만` : v.toLocaleString()
                }
              />
              <YAxis
                type="category"
                dataKey="title"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={80}
                tickFormatter={(v: string) =>
                  v.length > 6 ? v.slice(0, 6) + '…' : v
                }
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
                  '글자 수',
                ]}
              />
              <Bar
                dataKey="chars"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
