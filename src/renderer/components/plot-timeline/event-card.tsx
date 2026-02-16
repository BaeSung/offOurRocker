import { Pencil, Trash2, GripVertical } from 'lucide-react'
import type { PlotEvent } from '../../../shared/types'

interface EventCardProps {
  event: PlotEvent
  onEdit: (event: PlotEvent) => void
  onDelete: (id: string) => void
  compact?: boolean
}

export function EventCard({ event, onEdit, onDelete, compact }: EventCardProps) {
  if (compact) {
    return (
      <div className="group flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5 transition-colors hover:bg-secondary/50">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: event.color }}
        />
        <span className="flex-1 truncate text-[11px] text-foreground">
          {event.title}
        </span>
      </div>
    )
  }

  return (
    <div className="group flex gap-3 rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.04)]">
      <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
        <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground/40 active:cursor-grabbing" />
        <span
          className="mt-1 h-3 w-3 rounded-full"
          style={{ background: event.color }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">{event.title}</h3>
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onEdit(event)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        {event.description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
            {event.description}
          </p>
        )}
      </div>
    </div>
  )
}
