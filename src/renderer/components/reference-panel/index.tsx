import { useState } from 'react'
import { X, Users, Globe, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MiniTimeline } from '@/components/plot-timeline/mini-timeline'
import { CharactersTab } from './characters-tab'
import { WorldNotesTab } from './world-notes-tab'

type TabType = 'characters' | 'worldNotes' | 'plotEvents'

interface ReferencePanelProps {
  open: boolean
  onClose: () => void
  workId: string | null
}

export function ReferencePanel({ open, onClose, workId }: ReferencePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('characters')

  if (!open) return null

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-border bg-card print-hide">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('characters')}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
              activeTab === 'characters'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            인물
          </button>
          <button
            onClick={() => setActiveTab('worldNotes')}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
              activeTab === 'worldNotes'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Globe className="h-3.5 w-3.5" />
            세계관
          </button>
          <button
            onClick={() => setActiveTab('plotEvents')}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
              activeTab === 'plotEvents'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <GitBranch className="h-3.5 w-3.5" />
            플롯
          </button>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {workId ? (
        activeTab === 'characters' ? (
          <CharactersTab workId={workId} />
        ) : activeTab === 'worldNotes' ? (
          <WorldNotesTab workId={workId} />
        ) : (
          <MiniTimeline workId={workId} />
        )
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12">
          <Users className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground">작품을 선택해주세요.</p>
        </div>
      )}
    </div>
  )
}
