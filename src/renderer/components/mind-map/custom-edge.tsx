import { useState, useRef, useEffect, useCallback } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from '@xyflow/react'
import { X } from 'lucide-react'

export interface LabeledEdgeData {
  label?: string
  onLabelChange?: (edgeId: string, label: string) => void
  onDelete?: (edgeId: string) => void
  [key: string]: unknown
}

export type LabeledEdge = Edge<LabeledEdgeData, 'labeled'>

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
  selected,
}: EdgeProps<LabeledEdge>) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const label = data?.label || ''
  const showOverlay = editing || !!label || selected

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const startEdit = useCallback(() => {
    setEditValue(label)
    setEditing(true)
  }, [label])

  const commitLabel = useCallback(() => {
    setEditing(false)
    const trimmed = editValue.trim()
    if (trimmed !== label) {
      data?.onLabelChange?.(id, trimmed)
    }
  }, [editValue, label, data, id])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commitLabel()
      } else if (e.key === 'Escape') {
        setEditing(false)
      }
    },
    [commitLabel]
  )

  const handleDelete = useCallback(() => {
    data?.onDelete?.(id)
  }, [data, id])

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          ...(selected ? { stroke: 'hsl(30 60% 70%)', strokeWidth: 2.5 } : {}),
        }}
        markerEnd={markerEnd}
        interactionWidth={20}
      />
      {showOverlay && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
          >
            {editing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitLabel}
                onKeyDown={handleKeyDown}
                className="h-6 w-28 rounded border border-primary/60 bg-card px-2 text-center text-[11px] text-foreground outline-none"
                maxLength={30}
              />
            ) : label ? (
              <div className="flex items-center gap-1">
                <button
                  onDoubleClick={startEdit}
                  className="rounded-full border border-border/60 bg-card/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {label}
                </button>
                {selected && (
                  <button
                    onClick={handleDelete}
                    className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive/80 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive"
                    title="관계선 삭제"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            ) : selected ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={startEdit}
                  className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-border/60 bg-card/80 text-[10px] text-muted-foreground/50 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40 hover:text-muted-foreground"
                  title="라벨 추가"
                >
                  +
                </button>
                <button
                  onClick={handleDelete}
                  className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive/80 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive"
                  title="관계선 삭제"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
