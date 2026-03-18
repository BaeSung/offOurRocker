import { memo, useState, useCallback } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { User, Globe, Flag, BookOpen, StickyNote, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MindMapNodeType = 'character' | 'worldNote' | 'plotEvent' | 'chapter' | 'free'

export interface MindMapNodeData {
  label: string
  description?: string
  color?: string
  nodeType: MindMapNodeType
  sourceId?: string
  role?: string
  category?: string
  onDelete?: (id: string) => void
  onLabelChange?: (id: string, label: string) => void
  [key: string]: unknown
}

export type MindMapNode = Node<MindMapNodeData, 'custom'>

const TYPE_CONFIG: Record<MindMapNodeType, {
  icon: React.ComponentType<{ className?: string }>
  defaultColor: string
  label: string
}> = {
  character: { icon: User, defaultColor: '#d4a574', label: '캐릭터' },
  worldNote: { icon: Globe, defaultColor: '#4ade80', label: '세계관' },
  plotEvent: { icon: Flag, defaultColor: '#3b82f6', label: '플롯' },
  chapter: { icon: BookOpen, defaultColor: '#818cf8', label: '챕터' },
  free: { icon: StickyNote, defaultColor: '#d4a574', label: '자유' },
}

const ROLE_COLORS: Record<string, string> = {
  '주인공': '#d4a574',
  '조연': '#60a5fa',
  '악역': '#f87171',
  '기타': '#9ca3af',
}

const CATEGORY_COLORS: Record<string, string> = {
  '장소': '#4ade80',
  '세력': '#c084fc',
  '설정': '#22d3ee',
  '역사': '#fb923c',
  '기타': '#9ca3af',
}

function getNodeColor(data: MindMapNodeData): string {
  if (data.color) return data.color
  if (data.nodeType === 'character' && data.role) {
    return ROLE_COLORS[data.role] || TYPE_CONFIG.character.defaultColor
  }
  if (data.nodeType === 'worldNote' && data.category) {
    return CATEGORY_COLORS[data.category] || TYPE_CONFIG.worldNote.defaultColor
  }
  return TYPE_CONFIG[data.nodeType].defaultColor
}

function CustomNodeComponent({ id, data, selected }: NodeProps<MindMapNode>) {
  const nodeData = data
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(nodeData.label)
  const color = getNodeColor(nodeData)
  const config = TYPE_CONFIG[nodeData.nodeType]
  const Icon = config.icon

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    setEditValue(nodeData.label)
  }, [nodeData.label])

  const handleBlur = useCallback(() => {
    setIsEditing(false)
    if (editValue.trim() && editValue !== nodeData.label) {
      nodeData.onLabelChange?.(id, editValue.trim())
    }
  }, [id, editValue, nodeData])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur()
    }
    if (e.key === 'Escape') {
      setEditValue(nodeData.label)
      setIsEditing(false)
    }
  }, [nodeData.label])

  return (
    <div
      className={cn(
        'group relative min-w-[160px] max-w-[240px] rounded-lg border bg-card shadow-md transition-shadow duration-150',
        selected ? 'shadow-lg ring-2 ring-primary/40' : 'hover:shadow-lg'
      )}
      style={{ borderColor: color + '40' }}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
      />

      {/* Color accent bar */}
      <div
        className="h-1 rounded-t-lg"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start gap-2 px-3 py-2">
        <div
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
          style={{ backgroundColor: color + '20', color }}
        >
          <Icon className="h-3 w-3" />
        </div>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full rounded border border-border bg-secondary px-1 py-0.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
            />
          ) : (
            <p className="truncate text-xs font-semibold text-foreground">
              {nodeData.label}
            </p>
          )}
          {nodeData.description && (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-muted-foreground">
              {nodeData.description}
            </p>
          )}
        </div>
      </div>

      {/* Delete button (visible on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          nodeData.onDelete?.(id)
        }}
        className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-transform hover:scale-110 group-hover:flex"
        aria-label="노드 삭제"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-card !bg-primary"
      />
    </div>
  )
}

export const CustomNode = memo(CustomNodeComponent)
