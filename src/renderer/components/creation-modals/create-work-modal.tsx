import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { toast } from '@/hooks/use-toast'
import {
  X,
  BookOpen,
  PenLine,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkStore } from '@/stores/useWorkStore'
import { useAppStore } from '@/stores/useAppStore'
import { ModalOverlay, FieldLabel, TextInput } from './modal-primitives'

type WorkType = 'novel' | 'short'
type GenreOption = 'horror' | 'sf' | 'literary' | 'fantasy' | 'other'
type Belonging = 'standalone' | 'series'

interface GenreDef {
  key: GenreOption
  label: string
  dot: string
  border: string
  bg: string
}

const GENRES: GenreDef[] = [
  { key: 'horror', label: '공포', dot: 'bg-amber-400', border: 'border-amber-400', bg: 'bg-amber-400/10' },
  { key: 'sf', label: 'SF', dot: 'bg-teal-400', border: 'border-teal-400', bg: 'bg-teal-400/10' },
  { key: 'literary', label: '순문학', dot: 'bg-rose-400', border: 'border-rose-400', bg: 'bg-rose-400/10' },
  { key: 'fantasy', label: '판타지', dot: 'bg-violet-400', border: 'border-violet-400', bg: 'bg-violet-400/10' },
  { key: 'other', label: '기타', dot: 'bg-neutral-400', border: 'border-neutral-400', bg: 'bg-neutral-400/10' },
]

export function CreateWorkModal({
  open,
  onClose,
  onSwitchToSeries,
}: {
  open: boolean
  onClose: () => void
  onSwitchToSeries: () => void
}) {
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState(false)
  const [titleErrorMsg, setTitleErrorMsg] = useState('')
  const [workType, setWorkType] = useState<WorkType>('short')
  const [genre, setGenre] = useState<GenreOption>('horror')
  const [belonging, setBelonging] = useState<Belonging>('standalone')
  const [selectedSeries, setSelectedSeries] = useState('')
  const [goalChars, setGoalChars] = useState('')
  const [deadline, setDeadline] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [chapterTitle, setChapterTitle] = useState('')
  const [seriesDropdownOpen, setSeriesDropdownOpen] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const { series } = useWorkStore()
  const { createWork } = useWorkStore()
  const setActiveDocument = useAppStore((s) => s.setActiveDocument)

  useEffect(() => {
    if (open) {
      setTitle('')
      setTitleError(false)
      setTitleErrorMsg('')
      setWorkType('short')
      setGenre('horror')
      setBelonging('standalone')
      setSelectedSeries(series[0]?.id ?? '')
      setGoalChars('')
      setDeadline('')
      setTags([])
      setTagInput('')
      setChapterTitle('')
    }
  }, [open, series])

  const [creating, setCreating] = useState(false)

  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      setTitleError(true)
      setTitleErrorMsg('제목을 입력해주세요')
      titleRef.current?.focus()
      return
    }
    if (creating) return
    setCreating(true)

    try {
      const rawGoal = goalChars.replace(/,/g, '')
      const workId = await createWork({
        title: title.trim(),
        type: workType,
        genre,
        seriesId: belonging === 'series' ? selectedSeries : undefined,
        goalChars: rawGoal ? Number(rawGoal) : undefined,
        deadline: deadline || undefined,
        tags: tags.length > 0 ? tags : undefined,
        firstChapterTitle: workType === 'novel' && chapterTitle.trim() ? chapterTitle.trim() : undefined,
      })

      onClose()
      toast({ description: `'${title.trim()}' 작품이 생성되었습니다.` })

      if (workType === 'short') {
        setActiveDocument(workId, null)
      } else {
        const work = await window.api.works.getById(workId)
        if (work?.chapters?.[0]) {
          setActiveDocument(workId, work.chapters[0].id)
        }
      }
    } catch {
      toast({ description: '작품 생성에 실패했습니다.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }, [title, workType, genre, belonging, selectedSeries, goalChars, deadline, tags, chapterTitle, onClose, createWork, setActiveDocument, creating])

  const formatNumber = (val: string) => {
    const num = val.replace(/[^0-9]/g, '')
    if (!num) return ''
    return Number(num).toLocaleString()
  }

  const rawGoalChars = goalChars.replace(/,/g, '')
  const manuscriptPages = rawGoalChars ? Math.ceil(Number(rawGoalChars) / 200) : 0

  const dDay = (() => {
    if (!deadline) return null
    const target = new Date(deadline)
    if (isNaN(target.getTime())) return null
    return Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  })()

  const handleTagKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="w-full max-w-[520px] rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">새 작품 만들기</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scrollbar-thin max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          <div>
            <FieldLabel required>제목</FieldLabel>
            <TextInput
              inputRef={titleRef}
              value={title}
              onChange={(v) => {
                setTitle(v)
                if (v.trim()) { setTitleError(false); setTitleErrorMsg('') }
              }}
              placeholder="작품 제목을 입력하세요"
              autoFocus
              error={titleError}
            />
            {titleErrorMsg && (
              <p className="mt-1 text-xs text-destructive">{titleErrorMsg}</p>
            )}
          </div>

          <div>
            <FieldLabel required>유형</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'novel' as const, icon: BookOpen, label: '장편', desc: '챕터로 구성된 긴 작품' },
                { key: 'short' as const, icon: PenLine, label: '단편', desc: '하나의 본문으로 된 짧은 작품' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setWorkType(opt.key)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all duration-150',
                    workType === opt.key
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  )}
                >
                  <opt.icon className={cn(
                    'h-5 w-5',
                    workType === opt.key ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className={cn(
                    'text-sm font-medium',
                    workType === opt.key ? 'text-foreground' : 'text-secondary-foreground'
                  )}>
                    {opt.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              'overflow-hidden transition-all duration-200 ease-out',
              workType === 'novel' ? 'max-h-28 opacity-100' : 'max-h-0 opacity-0'
            )}
          >
            <FieldLabel>첫 번째 챕터</FieldLabel>
            <TextInput
              value={chapterTitle}
              onChange={setChapterTitle}
              placeholder="1장: 제목 없음"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {'챕터는 나중에 추가할 수 있습니다'}
            </p>
          </div>

          <div>
            <FieldLabel required>장르</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGenre(g.key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                    genre === g.key
                      ? cn(g.border, g.bg, 'text-foreground')
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', g.dot)} />
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>소속</FieldLabel>
            <div className="flex gap-4">
              {([
                { key: 'standalone' as const, label: '독립 작품' },
                { key: 'series' as const, label: '시리즈에 추가' },
              ]).map((opt) => (
                <label key={opt.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                      belonging === opt.key ? 'border-primary' : 'border-muted-foreground/40'
                    )}
                  >
                    {belonging === opt.key && (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </span>
                  <input
                    type="radio"
                    name="belonging"
                    value={opt.key}
                    checked={belonging === opt.key}
                    onChange={() => setBelonging(opt.key)}
                    className="sr-only"
                  />
                  <span className={cn(
                    belonging === opt.key ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>

            <div
              className={cn(
                'overflow-hidden transition-all duration-200 ease-out',
                belonging === 'series' ? 'mt-3 max-h-40 opacity-100' : 'max-h-0 opacity-0'
              )}
            >
              <div className="relative">
                <button
                  onClick={() => setSeriesDropdownOpen(!seriesDropdownOpen)}
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm text-foreground transition-colors hover:border-muted-foreground/40"
                >
                  <span>
                    {series.find((s) => s.id === selectedSeries)?.title ?? '시리즈 선택'}
                  </span>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', seriesDropdownOpen && 'rotate-180')} />
                </button>
                {seriesDropdownOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-lg border border-border bg-popover py-1 shadow-xl">
                    {series.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSeries(s.id)
                          setSeriesDropdownOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-secondary',
                          selectedSeries === s.id ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        {s.title}
                      </button>
                    ))}
                    <div className="border-t border-border">
                      <button
                        onClick={() => {
                          setSeriesDropdownOpen(false)
                          onClose()
                          onSwitchToSeries()
                        }}
                        className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-secondary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {'새 시리즈 만들기'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <FieldLabel>목표 글자수</FieldLabel>
            <TextInput
              value={goalChars}
              onChange={(v) => setGoalChars(formatNumber(v))}
              placeholder="예: 50000"
              suffix="자"
            />
            {rawGoalChars && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {'원고지 약 '}
                <span className="tabular-nums text-secondary-foreground transition-all">
                  {manuscriptPages.toLocaleString()}
                </span>
                {'매'}
              </p>
            )}
          </div>

          <div>
            <FieldLabel>마감일</FieldLabel>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 [color-scheme:dark]"
            />
            {dDay !== null && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {dDay > 0
                  ? <><span className="font-medium text-primary">{'D-'}{dDay}</span>{' 남았습니다'}</>
                  : dDay === 0
                  ? <span className="font-medium text-destructive">{'D-Day 입니다'}</span>
                  : <span className="font-medium text-destructive">{'D+'}{Math.abs(dDay)}{' 지났습니다'}</span>
                }
              </p>
            )}
          </div>

          <div>
            <FieldLabel>태그</FieldLabel>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex animate-[popIn_0.15s_ease-out] items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {tag}
                  <button
                    onClick={() => setTags(tags.filter((t) => t !== tag))}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`${tag} 삭제`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? '태그 입력 후 Enter' : ''}
                className="min-w-[100px] flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-primary/40 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            {'취소'}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className={cn(
              'h-9 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]',
              (creating || !title.trim()) && 'opacity-60'
            )}
          >
            {creating ? '생성 중...' : '만들기'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
