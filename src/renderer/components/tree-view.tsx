import { useState } from 'react'
import { ChevronRight, FolderOpen, Folder as FolderIcon, FolderInput, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkStore } from '@/stores/useWorkStore'
import { useAppStore } from '@/stores/useAppStore'
import { WorkItem, InlineRenameInput } from '@/components/tree-item'
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
import type { Work, Folder } from '../../shared/types'

type WorkWithChapters = Work & { chapters?: { id: string; title: string; sortOrder: number }[]; charCount?: number }
type SeriesNode = { id: string; folderId: string | null; title: string; works: WorkWithChapters[] }

/* ── Folder collapse state persisted across sessions ── */
const COLLAPSE_KEY = 'oor.folderCollapsed'

function isFolderCollapsed(folderId: string): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}')
    return !!map[folderId]
  } catch {
    return false
  }
}

function setFolderCollapsed(folderId: string, collapsed: boolean): void {
  try {
    const map = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}')
    if (collapsed) map[folderId] = true
    else delete map[folderId]
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(map))
  } catch {
    // ignore persistence failures
  }
}

function SeriesContextMenu({
  children,
  seriesId,
  currentFolderId,
  onStartRename,
}: {
  children: React.ReactNode
  seriesId: string
  currentFolderId: string | null
  onStartRename: () => void
}) {
  const deleteSeries = useWorkStore((s) => s.deleteSeries)
  const folders = useWorkStore((s) => s.folders)
  const moveSeriesToFolder = useWorkStore((s) => s.moveSeriesToFolder)

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
        {folders.length > 1 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-xs text-popover-foreground focus:bg-secondary focus:text-foreground">
              폴더로 이동
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-40 bg-popover border-border">
              {folders
                .filter((f) => f.id !== currentFolderId)
                .map((f) => (
                  <ContextMenuItem
                    key={f.id}
                    className="text-xs text-popover-foreground focus:bg-secondary focus:text-foreground"
                    onClick={() => moveSeriesToFolder(seriesId, f.id)}
                  >
                    {f.title}
                  </ContextMenuItem>
                ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-xs text-red-400 focus:bg-red-500/10 focus:text-red-400"
          onClick={() => deleteSeries(seriesId)}
        >
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function SeriesFolder({
  series,
  selectedId,
  onSelect,
}: {
  series: SeriesNode
  selectedId: string | null
  onSelect: (id: string, type: 'work' | 'chapter', workId?: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const updateSeries = useWorkStore((s) => s.updateSeries)

  const handleRename = async (title: string) => {
    await updateSeries(series.id, { title })
    setRenaming(false)
  }

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <SeriesContextMenu
        seriesId={series.id}
        currentFolderId={series.folderId}
        onStartRename={() => setRenaming(true)}
      >
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
          {renaming ? (
            <InlineRenameInput
              value={series.title}
              onConfirm={handleRename}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <span className="truncate">{series.title}</span>
          )}
        </button>
      </SeriesContextMenu>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="ml-3 border-l border-border/50 pl-1" role="group">
          {series.works.map((work) => (
            <WorkItem key={work.id} work={work} selectedId={selectedId} onSelect={onSelect} depth={1} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FolderContextMenu({
  children,
  folderId,
  isOnlyFolder,
  onStartRename,
}: {
  children: React.ReactNode
  folderId: string
  isOnlyFolder: boolean
  onStartRename: () => void
}) {
  const deleteFolder = useWorkStore((s) => s.deleteFolder)

  const handleDelete = async () => {
    const result = await deleteFolder(folderId)
    if (!result.success) {
      toast({ description: '마지막 폴더는 삭제할 수 없습니다.', variant: 'destructive' })
    }
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
        <ContextMenuSeparator />
        <ContextMenuItem
          className="text-xs text-red-400 focus:bg-red-500/10 focus:text-red-400 data-[disabled]:opacity-40"
          disabled={isOnlyFolder}
          onClick={handleDelete}
        >
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function FolderNode({
  folder,
  seriesList,
  works,
  isOnlyFolder,
  selectedId,
  onSelect,
}: {
  folder: Folder
  seriesList: SeriesNode[]
  works: WorkWithChapters[]
  isOnlyFolder: boolean
  selectedId: string | null
  onSelect: (id: string, type: 'work' | 'chapter', workId?: string) => void
}) {
  const [expanded, setExpanded] = useState(() => !isFolderCollapsed(folder.id))
  const [renaming, setRenaming] = useState(false)
  const renameFolder = useWorkStore((s) => s.renameFolder)

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    setFolderCollapsed(folder.id, !next)
  }

  const handleRename = async (title: string) => {
    await renameFolder(folder.id, title)
    setRenaming(false)
  }

  const count = seriesList.length + works.length

  return (
    <div role="treeitem" aria-expanded={expanded}>
      <FolderContextMenu
        folderId={folder.id}
        isOnlyFolder={isOnlyFolder}
        onStartRename={() => setRenaming(true)}
      >
        <button
          onClick={toggle}
          className="group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-foreground/90 transition-colors duration-150 hover:bg-secondary/50"
        >
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-90'
            )}
          />
          <FolderIcon className="h-3.5 w-3.5 shrink-0 text-amber-500/80" />
          {renaming ? (
            <InlineRenameInput
              value={folder.title}
              onConfirm={handleRename}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <>
              <span className="truncate normal-case">{folder.title}</span>
              {count > 0 && (
                <span className="ml-auto shrink-0 text-[10px] font-normal tabular-nums text-muted-foreground">
                  {count}
                </span>
              )}
            </>
          )}
        </button>
      </FolderContextMenu>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          expanded ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="ml-2 border-l border-border/40 pl-1" role="group">
          {seriesList.map((s) => (
            <SeriesFolder key={s.id} series={s} selectedId={selectedId} onSelect={onSelect} />
          ))}
          {works.map((work) => (
            <WorkItem key={work.id} work={work} selectedId={selectedId} onSelect={onSelect} depth={1} />
          ))}
          {count === 0 && (
            <p className="px-2 py-1.5 text-[11px] text-muted-foreground/60">비어 있음</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function TreeView({ collapsed, onItemSelect }: { collapsed: boolean; onItemSelect?: () => void }) {
  const folders = useWorkStore((s) => s.folders)
  const series = useWorkStore((s) => s.series)
  const standaloneWorks = useWorkStore((s) => s.standaloneWorks)
  const setFolderModalOpen = useAppStore((s) => s.setFolderModalOpen)
  const activeDocument = useAppStore((s) => s.activeDocument)
  const setActiveDocument = useAppStore((s) => s.setActiveDocument)

  const selectedId = activeDocument?.chapterId || activeDocument?.workId || null

  const handleSelect = (id: string, type: 'work' | 'chapter', workId?: string) => {
    if (type === 'chapter' && workId) {
      setActiveDocument(workId, id)
    } else {
      setActiveDocument(id, null)
    }
    onItemSelect?.()
  }

  if (collapsed) return null

  // Bucket series & standalone works by folder; anything pointing at a missing
  // folder is treated as unfiled and surfaced in a "미분류" group at the bottom.
  const knownIds = new Set(folders.map((f) => f.id))
  const seriesByFolder = (fid: string) => series.filter((s) => s.folderId === fid)
  const worksByFolder = (fid: string) => standaloneWorks.filter((w) => w.folderId === fid)
  const orphanSeries = series.filter((s) => !s.folderId || !knownIds.has(s.folderId))
  const orphanWorks = standaloneWorks.filter((w) => !w.folderId || !knownIds.has(w.folderId))
  const hasOrphans = orphanSeries.length > 0 || orphanWorks.length > 0
  const isEmpty = folders.length === 0 && !hasOrphans

  return (
    <div>
      <div className="px-2 py-1" role="tree" aria-label="작품 목록">
        <div className="mb-1 flex items-center justify-between px-2">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            폴더
          </p>
          <button
            onClick={() => setFolderModalOpen(true)}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            aria-label="새 폴더"
            title="새 폴더"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {folders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            seriesList={seriesByFolder(folder.id)}
            works={worksByFolder(folder.id)}
            isOnlyFolder={folders.length === 1}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        ))}

        {hasOrphans && (
          <div role="treeitem" aria-expanded className="mt-1">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold text-muted-foreground">
              <FolderInput className="h-3.5 w-3.5 shrink-0" />
              <span>미분류</span>
            </div>
            <div className="ml-2 border-l border-border/40 pl-1" role="group">
              {orphanSeries.map((s) => (
                <SeriesFolder key={s.id} series={s} selectedId={selectedId} onSelect={handleSelect} />
              ))}
              {orphanWorks.map((work) => (
                <WorkItem key={work.id} work={work} selectedId={selectedId} onSelect={handleSelect} depth={1} />
              ))}
            </div>
          </div>
        )}

        {isEmpty && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            작품이 없습니다.
            <br />
            새 작품을 만들어 보세요.
          </p>
        )}
      </div>
    </div>
  )
}
