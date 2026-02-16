import { useState, useEffect, useCallback } from 'react'
import { Plus, GitBranch } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { EventCard } from './event-card'
import { EventFormDialog } from './event-form-dialog'
import type { PlotEvent } from '../../../shared/types'

interface MiniTimelineProps {
  workId: string
}

export function MiniTimeline({ workId }: MiniTimelineProps) {
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
      } else {
        await window.api.plotEvents.create({
          workId,
          title: data.title,
          description: data.description,
          color: data.color,
          chapterId: data.chapterId ?? undefined,
        })
      }
      await loadEvents()
    } catch {
      toast({ description: '저장에 실패했습니다.', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 py-2">
        <button
          onClick={() => {
            setEditingEvent(null)
            setDialogOpen(true)
          }}
          className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-3 w-3" />
          이벤트 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {!loading && events.length === 0 && (
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
                onEdit={handleEdit}
                onDelete={handleDelete}
                compact
              />
            ))}
          </div>
        )}
      </div>

      <EventFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        event={editingEvent}
      />
    </div>
  )
}
