import { X, FileText, Tag, Clock, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/stores/useAppStore'
import { useWorkStore } from '@/stores/useWorkStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { GENRE_CONFIG, STATUS_CONFIG } from '../../shared/types'

interface InspectorPanelProps {
  open: boolean
  onClose: () => void
}

function InspectorRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2 py-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-xs text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function InspectorPanel({ open, onClose }: InspectorPanelProps) {
  const activeDocument = useAppStore((s) => s.activeDocument)
  const { series, standaloneWorks } = useWorkStore()
  const charCountNoSpaces = useEditorStore((s) => s.charCountNoSpaces)

  const activeWork = (() => {
    if (!activeDocument) return null
    for (const s of series) {
      for (const w of s.works) {
        if (w.id === activeDocument.workId) return w
      }
    }
    return standaloneWorks.find((w) => w.id === activeDocument.workId) || null
  })()

  const activeChapter = (() => {
    if (!activeDocument?.chapterId || !activeWork?.chapters) return null
    return activeWork.chapters.find((c) => c.id === activeDocument.chapterId) || null
  })()

  const title = activeChapter?.title || activeWork?.title || '선택된 문서 없음'
  const genre = activeWork?.genre ? GENRE_CONFIG[activeWork.genre]?.label || activeWork.genre : '-'
  const status = activeWork?.status ? STATUS_CONFIG[activeWork.status]?.label || activeWork.status : '-'
  const charDisplay = charCountNoSpaces > 0 ? `${charCountNoSpaces.toLocaleString()}자` : '-'
  const updatedAt = activeWork?.updatedAt
    ? new Date(activeWork.updatedAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-'

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-l border-border bg-card transition-[width,opacity] duration-300 ease-in-out overflow-hidden',
        open ? 'w-[240px] opacity-100' : 'w-0 opacity-0'
      )}
      role="complementary"
      aria-label="인스펙터 패널"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        <span className="text-xs font-medium text-foreground">인스펙터</span>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          aria-label="인스펙터 닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex-1 px-3 py-2">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          작품 정보
        </p>
        <InspectorRow icon={FileText} label="제목" value={title} />
        <Separator className="bg-border/50" />
        <InspectorRow icon={Tag} label="장르" value={genre} />
        <Separator className="bg-border/50" />
        <InspectorRow icon={Clock} label="상태" value={status} />
        <Separator className="bg-border/50" />
        <InspectorRow icon={BarChart3} label="글자수" value={charDisplay} />
        <Separator className="bg-border/50" />
        <InspectorRow icon={Clock} label="최근 수정" value={updatedAt} />
      </div>
    </aside>
  )
}
