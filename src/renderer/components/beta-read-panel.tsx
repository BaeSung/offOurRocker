import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpenCheck,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCw,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import { useWorkStore } from '@/stores/useWorkStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { GENRE_CONFIG, MAX_AI_INPUT_CHARS } from '../../shared/types'
import type { BetaReadReport, BetaReadEvidence, Genre } from '../../shared/types'
import type { Editor } from '@tiptap/react'

interface BetaReadPanelProps {
  open: boolean
  onClose: () => void
  editor: Editor | null
}

interface SectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}

function Section({ title, count, defaultOpen = true, children }: SectionProps) {
  const [openLocal, setOpenLocal] = useState(defaultOpen)
  if (count === 0) return null

  return (
    <div className="rounded-md border border-border/60 bg-secondary/20">
      <button
        onClick={() => setOpenLocal((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-foreground"
      >
        <span className="flex items-center gap-1.5">
          {openLocal ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
          {title}
          <span className="rounded-full bg-secondary/70 px-1.5 text-[10px] font-normal text-muted-foreground">
            {count}
          </span>
        </span>
      </button>
      {openLocal && <div className="border-t border-border/40 px-3 py-2">{children}</div>}
    </div>
  )
}

function EvidenceList({ items }: { items: BetaReadEvidence[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <li key={i} className="flex flex-col gap-1">
          <p className="text-[12px] leading-relaxed text-foreground">{it.point}</p>
          {it.evidence && (
            <blockquote className="border-l-2 border-primary/40 bg-background/60 px-2 py-1 text-[11px] italic leading-relaxed text-muted-foreground">
              {it.evidence}
            </blockquote>
          )}
        </li>
      ))}
    </ul>
  )
}

function StringList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-foreground">
          <span className="text-muted-foreground">·</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

const MODEL_PRESETS: { label: string; value: string }[] = [
  { label: 'Opus 4.7', value: 'claude-opus-4-7' },
  { label: 'Sonnet 4.6', value: 'claude-sonnet-4-6' },
  { label: 'Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
]

export function BetaReadPanel({ open, onClose, editor }: BetaReadPanelProps) {
  const activeDocument = useAppStore((s) => s.activeDocument)
  const { series, standaloneWorks } = useWorkStore()
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const aiModel = useSettingsStore((s) => s.aiModel)
  const betaReadModel = useSettingsStore((s) => s.betaReadModel)
  const setSetting = useSettingsStore((s) => s.setSetting)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [report, setReport] = useState<BetaReadReport | null>(null)
  const [editingModel, setEditingModel] = useState(false)
  const [modelDraft, setModelDraft] = useState('')

  const activeWork = useMemo(() => {
    if (!activeDocument) return null
    for (const s of series) {
      for (const w of s.works) if (w.id === activeDocument.workId) return w
    }
    return standaloneWorks.find((w) => w.id === activeDocument.workId) || null
  }, [activeDocument, series, standaloneWorks])

  const activeChapter = useMemo(() => {
    if (!activeDocument?.chapterId || !activeWork?.chapters) return null
    return activeWork.chapters.find((c) => c.id === activeDocument.chapterId) || null
  }, [activeDocument, activeWork])

  // Clear result when document switches
  useEffect(() => {
    setReport(null)
    setError('')
  }, [activeDocument?.workId, activeDocument?.chapterId])

  const effectiveModel = betaReadModel || aiModel || 'claude-opus-4-7'

  const currentText = useCallback(() => {
    if (!editor) return ''
    return editor.state.doc.textContent || ''
  }, [editor])

  const runReview = useCallback(async () => {
    if (!editor) return
    if (aiProvider === 'none') {
      setError('AI 설정에서 Claude API 키를 등록하세요.')
      return
    }

    const text = currentText()
    if (!text || text.trim().length < 100) {
      setError('리뷰할 원고가 너무 짧습니다. 최소 100자 이상 필요합니다.')
      return
    }
    if (text.length > MAX_AI_INPUT_CHARS) {
      setError(
        `원고가 ${MAX_AI_INPUT_CHARS.toLocaleString()}자를 초과합니다 (${text.length.toLocaleString()}자). 회차를 나눠 주세요.`
      )
      return
    }
    if (!effectiveModel) {
      setError('사용할 모델을 지정하세요.')
      return
    }

    setLoading(true)
    setError('')
    setReport(null)

    try {
      const result = await window.api.ai.betaRead(
        text,
        effectiveModel,
        'anthropic',
        {
          workTitle: activeWork?.title,
          chapterTitle: activeChapter?.title,
          genre: activeWork?.genre,
        }
      )
      if (result.success && result.report) {
        setReport(result.report)
      } else {
        setError(result.error || '베타리딩에 실패했습니다.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '베타리딩에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [editor, aiProvider, effectiveModel, activeWork, activeChapter, currentText])

  const applyModelDraft = () => {
    const trimmed = modelDraft.trim()
    setSetting('betaReadModel', trimmed)
    setEditingModel(false)
  }

  const selectPreset = (value: string) => {
    setSetting('betaReadModel', value)
    setModelDraft(value)
    setEditingModel(false)
  }

  if (!open) return null

  const presets = aiProvider !== 'none' ? MODEL_PRESETS : []
  const genreLabel = activeWork?.genre ? GENRE_CONFIG[activeWork.genre as Genre]?.label : null

  const textLength = currentText().length

  return (
    <div className="flex h-full w-[360px] shrink-0 flex-col border-l border-border bg-card print-hide">
      {/* Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold text-foreground">AI 베타리딩</h2>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Meta + config */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-[11px] text-muted-foreground">
            {activeWork?.title || '작품 미선택'}
            {genreLabel && (
              <span className="ml-1.5 text-[10px] text-muted-foreground/70">· {genreLabel}</span>
            )}
          </p>
          <p className="truncate text-xs font-medium text-foreground">
            {activeChapter?.title || '단편'}
          </p>
          <p
            className={cn(
              'text-[10px]',
              textLength > MAX_AI_INPUT_CHARS ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            원고 {textLength.toLocaleString()}자 / {MAX_AI_INPUT_CHARS.toLocaleString()}자
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              모델
            </span>
            {!editingModel && (
              <button
                onClick={() => {
                  setModelDraft(effectiveModel)
                  setEditingModel(true)
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground"
              >
                변경
              </button>
            )}
          </div>
          {editingModel ? (
            <>
              <div className="flex items-center gap-1">
                <input
                  value={modelDraft}
                  onChange={(e) => setModelDraft(e.target.value)}
                  placeholder="예: claude-opus-4-7"
                  className="h-7 flex-1 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyModelDraft()
                    if (e.key === 'Escape') setEditingModel(false)
                  }}
                />
                <button
                  onClick={applyModelDraft}
                  className="h-7 rounded border border-primary/40 px-2 text-[10px] text-primary hover:bg-primary/10"
                >
                  적용
                </button>
              </div>
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {presets.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => selectPreset(p.value)}
                      className={cn(
                        'rounded border px-1.5 py-0.5 text-[10px] transition-colors',
                        effectiveModel === p.value
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary/70" />
              <span className="truncate rounded bg-secondary/50 px-2 py-0.5 font-mono text-[10px] text-foreground">
                {effectiveModel || '설정되지 않음'}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={runReview}
          disabled={
            loading ||
            aiProvider === 'none' ||
            textLength < 100 ||
            textLength > MAX_AI_INPUT_CHARS
          }
          className={cn(
            'flex h-9 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors',
            'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              리뷰 중...
            </>
          ) : report ? (
            <>
              <RotateCw className="h-3.5 w-3.5" />
              다시 리뷰
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5" />
              리뷰 시작
            </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        {loading && !report && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">AI가 원고를 정독 중입니다</p>
            <p className="text-[10px] text-muted-foreground/70">
              원고 길이에 따라 30초~2분 소요됩니다
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && !report && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <BookOpenCheck className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">
              리뷰를 시작하면 구조·캐릭터·문체 등
              <br />
              여섯 개 관점의 피드백이 표시됩니다.
            </p>
          </div>
        )}

        {report && (
          <div className="flex flex-col gap-3">
            {report.overall && (
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  전반
                </p>
                <p className="text-[12px] leading-relaxed text-foreground">{report.overall}</p>
              </div>
            )}

            <Section title="구조·플롯" count={report.structure.length}>
              <EvidenceList items={report.structure} />
            </Section>
            <Section title="캐릭터" count={report.characters.length}>
              <EvidenceList items={report.characters} />
            </Section>
            <Section title="문체" count={report.prose.length}>
              <EvidenceList items={report.prose} />
            </Section>
            <Section title="페이싱" count={report.pacing.length} defaultOpen={false}>
              <StringList items={report.pacing} />
            </Section>
            <Section title="강점" count={report.strengths.length} defaultOpen={false}>
              <StringList items={report.strengths} />
            </Section>
            <Section title="작가에게 묻는 질문" count={report.questions.length} defaultOpen={false}>
              <StringList items={report.questions} />
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}
