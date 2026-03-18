import { useState, useEffect, useCallback } from 'react'
import { Plus, GitBranch } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { EventCard } from './event-card'
import type { PlotEvent } from '../../../shared/types'

const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

interface MiniTimelineProps {
  workId: string
}

export function MiniTimeline({ workId }: MiniTimelineProps) {
  const [events, setEvents] = useState<PlotEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formColor, setFormColor] = useState(COLORS[0])

  const loadEvents = useCallback(async () => {
    try {
      const result = await window.api.plotEvents.getByWork(workId)
      setEvents(result)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [workId])

  useEffect(() => {
    setLoading(true)
    loadEvents()
  }, [loadEvents])

  const resetForm = () => {
    setFormTitle('')
    setFormDesc('')
    setFormColor(COLORS[0])
    setEditingId(null)
    setIsCreating(false)
  }

  const startCreate = () => {
    resetForm()
    setIsCreating(true)
  }

  const startEdit = (event: PlotEvent) => {
    setFormTitle(event.title)
    setFormDesc(event.description || '')
    setFormColor(event.color)
    setEditingId(event.id)
    setIsCreating(false)
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.plotEvents.delete(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
      if (editingId === id) resetForm()
      toast({ description: '이벤트가 삭제되었습니다.' })
    } catch {
      toast({ description: '삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ description: '제목을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
      if (isCreating) {
        await window.api.plotEvents.create({
          workId,
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          color: formColor,
        })
        toast({ description: '이벤트가 추가되었습니다.' })
      } else if (editingId) {
        await window.api.plotEvents.update(editingId, {
          title: formTitle.trim(),
          description: formDesc.trim() || undefined,
          color: formColor,
        })
        toast({ description: '이벤트가 수정되었습니다.' })
      }
      resetForm()
      await loadEvents()
    } catch {
      toast({ description: '저장에 실패했습니다.', variant: 'destructive' })
    }
  }

  const isFormOpen = isCreating || editingId !== null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 py-2">
        <button
          onClick={startCreate}
          disabled={isCreating}
          className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          이벤트 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {!loading && events.length === 0 && !isFormOpen && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <GitBranch className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">플롯 이벤트를 추가해보세요</p>
          </div>
        )}

        {!loading && (
          <div className="flex flex-col gap-1.5">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={startEdit}
                onDelete={handleDelete}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Inline form */}
      {isFormOpen && (
        <div className="shrink-0 border-t border-border bg-card p-4">
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                제목
              </label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="이벤트 제목"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                설명
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="이벤트에 대한 상세 설명"
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-medium text-muted-foreground">
                색상
              </label>
              <div className="flex items-center gap-2.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormColor(c)}
                    className={
                      'h-7 w-7 rounded-full transition-all ' +
                      (formColor === c
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-110 opacity-75 hover:opacity-100')
                    }
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={resetForm}
                className="h-8 rounded-lg px-3.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="h-8 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
