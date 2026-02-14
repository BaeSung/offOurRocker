import { useState } from 'react'
import { Loader2, CheckCircle2, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SpellCorrection {
  original: string
  corrected: string
  explanation: string
}

interface SpellCheckPanelProps {
  open: boolean
  onClose: () => void
  loading: boolean
  corrections: SpellCorrection[]
  error?: string
  onApply: (original: string, corrected: string) => void
  onApplyAll: () => void
}

export function SpellCheckPanel({
  open,
  onClose,
  loading,
  corrections,
  error,
  onApply,
  onApplyAll,
}: SpellCheckPanelProps) {
  const [applied, setApplied] = useState<Set<number>>(new Set())

  if (!open) return null

  const handleApply = (idx: number, original: string, corrected: string) => {
    onApply(original, corrected)
    setApplied((prev) => new Set(prev).add(idx))
  }

  const unappliedCount = corrections.filter((_, i) => !applied.has(i)).length

  return (
    <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold text-foreground">맞춤법 검사</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[300px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">검사 중...</span>
          </div>
        )}

        {error && (
          <div className="px-3 py-4 text-center text-xs text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && corrections.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8">
            <CheckCircle2 className="h-6 w-6" style={{ color: 'hsl(140 60% 50%)' }} />
            <span className="text-xs text-muted-foreground">
              맞춤법 오류가 없습니다.
            </span>
          </div>
        )}

        {!loading && corrections.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {corrections.map((c, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex flex-col gap-1.5 px-3 py-2.5',
                  applied.has(idx) && 'opacity-40'
                )}
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive line-through">
                    {c.original}
                  </span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="rounded px-1.5 py-0.5 font-medium" style={{ color: 'hsl(140 60% 50%)', background: 'hsla(140, 60%, 50%, 0.1)' }}>
                    {c.corrected}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {c.explanation}
                  </span>
                  {!applied.has(idx) && (
                    <button
                      onClick={() => handleApply(idx, c.original, c.corrected)}
                      className="shrink-0 rounded px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
                    >
                      적용
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && corrections.length > 0 && unappliedCount > 0 && (
        <div className="border-t border-border px-3 py-2">
          <button
            onClick={() => {
              onApplyAll()
              setApplied(new Set(corrections.map((_, i) => i)))
            }}
            className="w-full rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            모두 적용 ({unappliedCount}개)
          </button>
        </div>
      )}
    </div>
  )
}
