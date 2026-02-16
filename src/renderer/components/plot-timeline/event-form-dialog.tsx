import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { PlotEvent } from '../../../shared/types'

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

interface EventFormDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    title: string
    description?: string
    color: string
    chapterId?: string | null
  }) => void
  event?: PlotEvent | null
  chapters?: { id: string; title: string }[]
}

export function EventFormDialog({
  open,
  onClose,
  onSave,
  event,
  chapters = [],
}: EventFormDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [chapterId, setChapterId] = useState<string>('')

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description || '')
      setColor(event.color)
      setChapterId(event.chapterId || '')
    } else {
      setTitle('')
      setDescription('')
      setColor(COLORS[0])
      setChapterId('')
    }
  }, [event, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      color,
      chapterId: chapterId || null,
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{event ? '이벤트 편집' : '새 이벤트'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="플롯 이벤트 제목"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/50"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이벤트에 대한 상세 설명"
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              색상
            </label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={
                    'h-6 w-6 rounded-full transition-all ' +
                    (color === c
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                      : 'hover:scale-110')
                  }
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {chapters.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                연결 챕터
              </label>
              <select
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary/50"
              >
                <option value="">없음</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.title === '__body__' ? '본문' : ch.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md px-4 text-sm text-muted-foreground hover:text-foreground"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {event ? '수정' : '추가'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
