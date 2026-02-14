import { useState, useRef, useEffect } from 'react'
import { ChevronRight, BookOpen, FileText, PenLine, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG, GENRE_CONFIG } from '../../shared/types'
import type { WorkStatus, Genre } from '../../shared/types'
import { useWorkStore } from '@/stores/useWorkStore'
import { toast } from '@/hooks/use-toast'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu'

function StatusDot({ status }: { status: WorkStatus }) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', config.color)}
      title={config.label}
      aria-label={`상태: ${config.label}`}
    />
  )
}

function GenreBadge({ genre }: { genre: Genre }) {
  const config = GENRE_CONFIG[genre]
  if (!config) return null
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1 py-0 text-[9px] font-medium leading-4',
        config.color
      )}
    >
      {config.label}
    </span>
  )
}

function formatCharCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}만자`
  }
  return `${count.toLocaleString()}자`
}

function InlineRenameInput({
  value,
  onConfirm,
  onCancel,
}: {
  value: string
  onConfirm: (newTitle: string) => void
  onCancel: () => void
}) {
  const [text, setText] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmed = text.trim()
      if (trimmed && trimmed !== value) onConfirm(trimmed)
      else onCancel()
    }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <input
      ref={inputRef}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        const trimmed = text.trim()
        if (trimmed && trimmed !== value) onConfirm(trimmed)
        else onCancel()
      }}
      className="w-full rounded border border-primary bg-background px-1 py-0.5 text-xs text-foreground outline-none"
    />
  )
}

function WorkContextMenu({
  children,
  workId,
  workTitle,
  seriesId,
  onStartRename,
}: {
  children: React.ReactNode
  workId: string
  workTitle: string
  seriesId?: string | null
  onStartRename: () => void
}) {
  const deleteWork = useWorkStore((s) => s.deleteWork)
  const duplicateWork = useWorkStore((s) => s.duplicateWork)
  const updateWork = useWorkStore((s) => s.updateWork)
  const allSeries = useWorkStore((s) => s.series)

  const handleMoveToSeries = async (targetSeriesId: string | null) => {
    await updateWork(workId, { seriesId: targetSeriesId })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-popover border-border">
        <ContextMenuItem
          className="text-xs text-popover-foreground focus:bg-secondary focus:text-foreground"
          onClick={onStartRename}
        >
          이름 변경
        </ContextMenuItem>
        <ContextMenuItem
          className="text-xs text-popover-foreground focus:bg-secondary focus:text-foreground"
          onClick={() => duplicateWork(workId)}
        >
          복제
        </ContextMenuItem>
        {allSeries.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-xs text-popover-foreground focus:bg-secondary focus:text-foreground">
              이동
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40 bg-popover border-border">
              {seriesId && (
                <ContextMenuItem
                  className="text-xs text-popover-foreground focus:bg-secondary focus:text-foreground"
                  onClick={() => handleMoveToSeries(null)}
                >
                  독립 작품으로
                </ContextMenuItem>
              )}
              {allSeries
                .filter((s) => s.id !== seriesId)
                .map((s) => (
                  <ContextMenuItem
                    key={s.id}
                    className="text-xs text-popover-foreground focus:bg-secondary focus:text-foreground"
                    onClick={() => handleMoveToSeries(s.id)}
                  >
                    {s.title}
                  </ContextMenuItem>
                ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-xs text-red-400 focus:bg-red-500/10 focus:text-red-400"
          onClick={() => deleteWork(workId)}
        >
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function ChapterContextMenu({
  children,
  chapterId,
  onStartRename,
}: {
  children: React.ReactNode
  chapterId: string
  onStartRename: () => void
}) {
  const deleteChapter = useWorkStore((s) => s.deleteChapter)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 bg-popover border-border">
        <ContextMenuItem
          className="text-xs text-popover-foreground focus:bg-secondary focus:text-foreground"
          onClick={onStartRename}
        >
          이름 변경
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-xs text-red-400 focus:bg-red-500/10 focus:text-red-400"
          onClick={() => deleteChapter(chapterId)}
        >
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

// Chapter item (leaf node)
export function ChapterItem({
  chapter,
  selected,
  onSelect,
}: {
  chapter: { id: string; title: string }
  selected: boolean
  onSelect: () => void
}) {
  const [renaming, setRenaming] = useState(false)
  const updateChapter = useWorkStore((s) => s.updateChapter)

  const handleRenameConfirm = async (newTitle: string) => {
    await updateChapter(chapter.id, { title: newTitle })
    setRenaming(false)
  }

  return (
    <ChapterContextMenu chapterId={chapter.id} onStartRename={() => setRenaming(true)}>
      <button
        onClick={onSelect}
        className={cn(
          'group relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150',
          selected
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
        )}
        role="treeitem"
        aria-selected={selected}
      >
        {selected && (
          <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
        )}
        <FileText className="h-3.5 w-3.5 shrink-0 opacity-60" />
        {renaming ? (
          <InlineRenameInput
            value={chapter.title}
            onConfirm={handleRenameConfirm}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span className="truncate">{chapter.title}</span>
        )}
      </button>
    </ChapterContextMenu>
  )
}

// Work item (can have children if it's a novel with chapters)
export function WorkItem({
  work,
  selectedId,
  onSelect,
  depth = 0,
}: {
  work: any
  selectedId: string | null
  onSelect: (id: string, type: 'work' | 'chapter', workId?: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const createChapter = useWorkStore((s) => s.createChapter)
  const updateWork = useWorkStore((s) => s.updateWork)

  const chapters = work.chapters?.filter((c: any) => c.title !== '__body__') || []
  const hasChapters = chapters.length > 0
  const isSelected = selectedId === work.id
  const Icon = work.type === 'novel' ? BookOpen : PenLine

  const handleAddChapter = async () => {
    const num = chapters.length + 1
    await createChapter(work.id, `${num}장: 제목 없음`)
  }

  const handleRenameConfirm = async (newTitle: string) => {
    await updateWork(work.id, { title: newTitle })
    setRenaming(false)
  }

  return (
    <div role="treeitem" aria-expanded={hasChapters ? expanded : undefined}>
      <WorkContextMenu
        workId={work.id}
        workTitle={work.title}
        seriesId={work.seriesId}
        onStartRename={() => setRenaming(true)}
      >
        <button
          onClick={() => {
            if (hasChapters) {
              setExpanded(!expanded)
            }
            // For short stories, select the work itself
            if (work.type === 'short') {
              onSelect(work.id, 'work')
            }
          }}
          className={cn(
            'group relative flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150',
            isSelected
              ? 'bg-secondary text-foreground'
              : 'text-foreground/80 hover:bg-secondary/50 hover:text-foreground'
          )}
        >
          {isSelected && (
            <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary" />
          )}
          {hasChapters ? (
            <ChevronRight
              className={cn(
                'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
                expanded && 'rotate-90'
              )}
            />
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
          {renaming ? (
            <InlineRenameInput
              value={work.title}
              onConfirm={handleRenameConfirm}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="flex-1 truncate">{work.title}</span>
          )}
          {!renaming && (
            <div className="flex items-center gap-1.5 shrink-0">
              <StatusDot status={work.status} />
              <GenreBadge genre={work.genre} />
            </div>
          )}
        </button>
      </WorkContextMenu>
      <div className="flex items-center gap-1.5 px-2 pb-1">
        <span className="w-3 shrink-0" />
        <span className="w-3.5 shrink-0" />
        <span className="text-[10px] text-muted-foreground">
          {formatCharCount(work.charCount || 0)}
        </span>
      </div>
      {hasChapters && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-200 ease-in-out',
            expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="ml-4 border-l border-border/50 pl-2" role="group">
            {chapters.map((chapter: any) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                selected={selectedId === chapter.id}
                onSelect={() => onSelect(chapter.id, 'chapter', work.id)}
              />
            ))}
            {/* Add chapter button */}
            {work.type === 'novel' && (
              <button
                onClick={handleAddChapter}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-muted-foreground/60 transition-colors hover:bg-secondary/30 hover:text-muted-foreground"
              >
                <Plus className="h-3 w-3" />
                <span>새 챕터</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
