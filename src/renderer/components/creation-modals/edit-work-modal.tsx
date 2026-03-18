import {
  useState,
  useEffect,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { toast } from '@/hooks/use-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkStore } from '@/stores/useWorkStore'
import { ModalOverlay, FieldLabel, TextInput } from './modal-primitives'
import type { Work, Genre } from '../../../shared/types'

type GenreOption = 'horror' | 'sf' | 'literary' | 'fantasy' | 'other'

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

export function EditWorkModal({
  open,
  onClose,
  work,
}: {
  open: boolean
  onClose: () => void
  work: Work
}) {
  const [genre, setGenre] = useState<GenreOption>(work.genre)
  const [goalChars, setGoalChars] = useState('')
  const [deadline, setDeadline] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  const { updateWork } = useWorkStore()

  useEffect(() => {
    if (open) {
      setGenre(work.genre)
      setGoalChars(work.goalChars ? work.goalChars.toLocaleString() : '')
      setDeadline(work.deadline || '')
      setTags(work.tags || [])
      setTagInput('')
    }
  }, [open, work])

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

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      await updateWork(work.id, {
        genre,
        goalChars: rawGoalChars ? Number(rawGoalChars) : null,
        deadline: deadline || null,
        tags,
      })
      onClose()
      toast({ description: '작품 속성이 수정되었습니다.' })
    } catch {
      toast({ description: '수정에 실패했습니다.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [saving, work.id, genre, rawGoalChars, deadline, tags, updateWork, onClose])

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">작품 속성 편집</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scrollbar-thin max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* Title (read-only) */}
          <div>
            <FieldLabel>제목</FieldLabel>
            <p className="rounded-lg bg-secondary/60 px-3 py-2.5 text-sm text-foreground">
              {work.title}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">제목은 사이드바에서 우클릭 → 이름 변경으로 수정할 수 있습니다.</p>
          </div>

          {/* Genre */}
          <div>
            <FieldLabel>장르</FieldLabel>
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

          {/* Goal chars */}
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

          {/* Deadline */}
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
            {deadline && (
              <button
                onClick={() => setDeadline('')}
                className="mt-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                마감일 삭제
              </button>
            )}
          </div>

          {/* Tags */}
          <div>
            <FieldLabel>태그</FieldLabel>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-background p-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
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
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'h-9 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]',
              saving && 'opacity-60'
            )}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
