import { useState } from 'react'
import { ChevronRight, FolderOpen, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkStore } from '@/stores/useWorkStore'
import { useAppStore } from '@/stores/useAppStore'
import { WorkItem } from '@/components/tree-item'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Work } from '../../shared/types'

type WorkWithChapters = Work & { chapters?: { id: string; title: string; sortOrder: number }[]; charCount?: number }

function SeriesFolder({
  series,
  selectedId,
  onSelect,
}: {
  series: { id: string; title: string; works: WorkWithChapters[] }
  selectedId: string | null
  onSelect: (id: string, type: 'work' | 'chapter', workId?: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-foreground transition-colors duration-150 hover:bg-secondary/50"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-90'
          )}
        />
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">{series.title}</span>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          expanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="ml-3 border-l border-border/50 pl-1" role="group">
          {series.works.map((work) => (
            <WorkItem
              key={work.id}
              work={work}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function StandaloneSection({
  works,
  selectedId,
  onSelect,
}: {
  works: WorkWithChapters[]
  selectedId: string | null
  onSelect: (id: string, type: 'work' | 'chapter', workId?: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  if (works.length === 0) return null

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs font-medium text-foreground transition-colors duration-150 hover:bg-secondary/50"
      >
        <ChevronRight
          className={cn(
            'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
            expanded && 'rotate-90'
          )}
        />
        <PenLine className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="truncate">독립 단편</span>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          expanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="ml-3 border-l border-border/50 pl-1" role="group">
          {works.map((work) => (
            <WorkItem
              key={work.id}
              work={work}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function TreeView({ collapsed, onItemSelect }: { collapsed: boolean; onItemSelect?: () => void }) {
  const { series, standaloneWorks } = useWorkStore()
  const activeDocument = useAppStore((s) => s.activeDocument)
  const setActiveDocument = useAppStore((s) => s.setActiveDocument)

  const selectedId = activeDocument?.chapterId || activeDocument?.workId || null

  const handleSelect = (id: string, type: 'work' | 'chapter', workId?: string) => {
    if (type === 'chapter' && workId) {
      setActiveDocument(workId, id)
    } else {
      // For short stories, chapterId is null (content accessed via works:getContent)
      setActiveDocument(id, null)
    }
    onItemSelect?.()
  }

  if (collapsed) return null

  return (
    <ScrollArea className="flex-1">
      <div className="px-2 py-1" role="tree" aria-label="작품 목록">
        <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          작품 목록
        </p>
        {series.map((s) => (
          <SeriesFolder
            key={s.id}
            series={s}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        ))}
        {series.length > 0 && standaloneWorks.length > 0 && <div className="my-2" />}
        <StandaloneSection
          works={standaloneWorks}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
        {series.length === 0 && standaloneWorks.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            작품이 없습니다.
            <br />
            새 작품을 만들어 보세요.
          </p>
        )}
      </div>
    </ScrollArea>
  )
}
