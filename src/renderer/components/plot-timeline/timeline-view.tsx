import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { EventCard } from './event-card'
import { EventFormDialog } from './event-form-dialog'
import type { PlotEvent } from '../../../shared/types'

interface TimelineViewProps {
  workId: string
  chapters?: { id: string; title: string }[]
}

export function TimelineView({ workId, chapters = [] }: TimelineViewProps) {
  const [events, setEvents] = useState<PlotEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<PlotEvent | null>(null)

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

  const handleCreate = () => {
    setEditingEvent(null)
    setDialogOpen(true)
  }

  const handleEdit = (event: PlotEvent) => {
    setEditingEvent(event)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.plotEvents.delete(id)
      setEvents((prev) => prev.filter((e) => e.id !== id))
      toast({ description: '이벤트가 삭제되었습니다.' })
    } catch {
      toast({ description: '삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleSave = async (data: {
    title: string
    description?: string
    color: string
    chapterId?: string | null
  }) => {
    try {
      if (editingEvent) {
        await window.api.plotEvents.update(editingEvent.id, data)
        toast({ description: '이벤트가 수정되었습니다.' })
      } else {
        await window.api.plotEvents.create({
          workId,
          title: data.title,
          description: data.description,
          color: data.color,
          chapterId: data.chapterId ?? undefined,
        })
        toast({ description: '이벤트가 추가되었습니다.' })
      }
      await loadEvents()
    } catch {
      toast({ description: '저장에 실패했습니다.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Horizontal timeline rail */}
      {events.length > 0 && (
        <div className="relative mb-2 flex items-center gap-2 overflow-x-auto pb-2">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
          {events.map((event, i) => (
            <button
              key={event.id}
              onClick={() => handleEdit(event)}
              className="relative z-10 flex shrink-0 flex-col items-center gap-1"
              title={event.title}
            >
              <span
                className="h-4 w-4 rounded-full border-2 border-background transition-transform hover:scale-125"
                style={{ background: event.color }}
              />
              <span className="max-w-[80px] truncate text-[10px] text-muted-foreground">
                {event.title}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Cards list */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="h-12 w-12 rounded-full bg-secondary/60 flex items-center justify-center">
            <Plus className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            플롯 이벤트를 추가해보세요
          </p>
          <button
            onClick={handleCreate}
            className="h-8 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            첫 이벤트 만들기
          </button>
        </div>
      ) : (
        <>
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          <button
            onClick={handleCreate}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
            이벤트 추가
          </button>
        </>
      )}

      <EventFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        event={editingEvent}
        chapters={chapters}
      />
    </div>
  )
}
