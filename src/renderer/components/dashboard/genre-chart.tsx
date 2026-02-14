import { useState, useEffect } from "react"
import { GENRE_CONFIG } from '../../../shared/types'

const GENRE_HSL: Record<string, string> = {
  horror: "hsl(30 40% 64%)",
  sf: "hsl(173 58% 45%)",
  literary: "hsl(350 60% 60%)",
  fantasy: "hsl(250 55% 60%)",
  other: "hsl(0 0% 55%)",
}

interface GenreData {
  genre: string
  label: string
  count: number
  percent: number
  hsl: string
}

function DonutChart({ genres, total, animated }: { genres: GenreData[]; total: number; animated: boolean }) {
  const radius = 54
  const stroke = 14
  const circumference = 2 * Math.PI * radius
  let cumulative = 0
  const totalPercent = genres.reduce((s, g) => s + g.percent, 0) || 1

  return (
    <svg viewBox="0 0 140 140" className="h-[160px] w-[160px]">
      {/* Background ring */}
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={stroke}
      />
      {genres.map((genre, i) => {
        const segmentLength = (genre.percent / totalPercent) * circumference
        const offset = circumference - (cumulative / totalPercent) * circumference
        cumulative += genre.percent
        return (
          <circle
            key={genre.genre}
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={genre.hsl}
            strokeWidth={stroke}
            strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            style={{
              transition: animated ? `stroke-dasharray 800ms ${i * 150}ms ease-out` : "none",
            }}
          />
        )
      })}
      {/* Center text */}
      <text
        x="70"
        y="66"
        textAnchor="middle"
        className="fill-foreground text-2xl font-bold"
        style={{ fontSize: "28px", fontWeight: 700 }}
      >
        {total}
      </text>
      <text
        x="70"
        y="84"
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: "11px" }}
      >
        전체 작품
      </text>
    </svg>
  )
}

export function GenreChart() {
  const [animated, setAnimated] = useState(false)
  const [genres, setGenres] = useState<GenreData[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    window.api.stats.genreDistribution().then((data) => {
      const sum = data.reduce((s, d) => s + d.count, 0) || 1
      const mapped: GenreData[] = data
        .filter((d) => d.count > 0)
        .map((d) => ({
          genre: d.genre,
          label: GENRE_CONFIG[d.genre as keyof typeof GENRE_CONFIG]?.label || d.genre,
          count: d.count,
          percent: Math.round((d.count / sum) * 100),
          hsl: GENRE_HSL[d.genre] || GENRE_HSL.other,
        }))
      setGenres(mapped)
      setTotal(data.reduce((s, d) => s + d.count, 0))
    }).catch(console.error)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (genres.length === 0 && total === 0) {
    return (
      <section
        style={{
          opacity: 0,
          animation: "fadeSlideUp 400ms 800ms ease-out forwards",
        }}
      >
        <h2 className="mb-4 font-sans text-lg font-semibold text-foreground">장르별 분포</h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">작품을 추가하면 장르 분포가 표시됩니다.</p>
        </div>
      </section>
    )
  }

  return (
    <section
      style={{
        opacity: 0,
        animation: "fadeSlideUp 400ms 800ms ease-out forwards",
      }}
    >
      <h2 className="mb-4 font-sans text-lg font-semibold text-foreground">장르별 분포</h2>
      <div className="flex items-center gap-8 rounded-xl border border-border bg-card p-6">
        <DonutChart genres={genres} total={total} animated={animated} />
        <div className="flex flex-col gap-3">
          {genres.map((g) => (
            <div key={g.genre} className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: g.hsl }}
              />
              <span className="w-14 text-sm text-foreground">{g.label}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {g.count}편
              </span>
              <span className="text-xs tabular-nums text-muted-foreground/60">
                {g.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
