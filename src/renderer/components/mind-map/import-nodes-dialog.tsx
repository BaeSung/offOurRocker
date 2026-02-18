import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { User, Globe, Flag, BookOpen } from 'lucide-react'
import type { Character, WorldNote, PlotEvent } from '../../../shared/types'
import type { MindMapNodeType } from './custom-node'

interface ImportNodesDialogProps {
  open: boolean
  onClose: () => void
  workId: string
  existingSourceIds: Set<string>
  onImport: (nodes: ImportedNode[]) => void
}

export interface ImportedNode {
  type: MindMapNodeType
  sourceId: string
  label: string
  description?: string
  color?: string
  role?: string
  category?: string
}

export function ImportNodesDialog({ open, onClose, workId, existingSourceIds, onImport }: ImportNodesDialogProps) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [worldNotes, setWorldNotes] = useState<WorldNote[]>([])
  const [plotEvents, setPlotEvents] = useState<PlotEvent[]>([])
  const [chapters, setChapters] = useState<{ id: string; title: string }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open || !workId) return
    setSelected(new Set())

    Promise.all([
      window.api.characters.getByWork(workId),
      window.api.worldNotes.getByWork(workId),
      window.api.plotEvents.getByWork(workId),
      window.api.works.getById(workId),
    ]).then(([chars, notes, events, work]) => {
      setCharacters(chars)
      setWorldNotes(notes)
      setPlotEvents(events)
      if (work?.chapters) {
        setChapters(work.chapters.map((c) => ({ id: c.id, title: c.title })))
      }
    }).catch(() => {})
  }, [open, workId])

  const allItems = useMemo(() => {
    const items: { id: string; type: MindMapNodeType; label: string; description?: string; disabled: boolean; color?: string; role?: string; category?: string }[] = []

    for (const c of characters) {
      items.push({
        id: c.id,
        type: 'character',
        label: c.name,
        description: c.description || undefined,
        disabled: existingSourceIds.has(c.id),
        role: c.role,
      })
    }
    for (const n of worldNotes) {
      items.push({
        id: n.id,
        type: 'worldNote',
        label: n.title,
        description: n.content || undefined,
        disabled: existingSourceIds.has(n.id),
        category: n.category,
      })
    }
    for (const e of plotEvents) {
      items.push({
        id: e.id,
        type: 'plotEvent',
        label: e.title,
        description: e.description || undefined,
        disabled: existingSourceIds.has(e.id),
        color: e.color,
      })
    }
    for (const ch of chapters) {
      if (ch.title === '__body__') continue
      items.push({
        id: ch.id,
        type: 'chapter',
        label: ch.title,
        disabled: existingSourceIds.has(ch.id),
      })
    }

    return items
  }, [characters, worldNotes, plotEvents, chapters, existingSourceIds])

  const availableItems = useMemo(() => allItems.filter((i) => !i.disabled), [allItems])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === availableItems.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(availableItems.map((i) => i.id)))
    }
  }

  const handleImport = () => {
    const nodes: ImportedNode[] = allItems
      .filter((i) => selected.has(i.id))
      .map((i) => ({
        type: i.type,
        sourceId: i.id,
        label: i.label,
        description: i.description,
        color: i.color,
        role: i.role,
        category: i.category,
      }))
    onImport(nodes)
    onClose()
  }

  const typeIcon: Record<MindMapNodeType, React.ComponentType<{ className?: string }>> = {
    character: User,
    worldNote: Globe,
    plotEvent: Flag,
    chapter: BookOpen,
    free: User,
  }

  const typeLabel: Record<MindMapNodeType, string> = {
    character: 'character',
    worldNote: 'worldNote',
    plotEvent: 'plotEvent',
    chapter: 'chapter',
    free: 'free',
  }

  const typeDisplayLabel: Record<MindMapNodeType, string> = {
    character: '캐릭터',
    worldNote: '세계관',
    plotEvent: '플롯',
    chapter: '챕터',
    free: '자유',
  }

  const groupedItems = useMemo(() => {
    const groups: Record<string, typeof allItems> = {}
    for (const item of allItems) {
      const key = typeLabel[item.type]
      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    }
    return groups
  }, [allItems])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg text-foreground">
            기존 데이터 불러오기
          </DialogTitle>
        </DialogHeader>

        {allItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            불러올 데이터가 없습니다.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <button
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {selected.size === availableItems.length ? '전체 해제' : '전체 선택'}
              </button>
              <span className="text-xs text-muted-foreground">
                {selected.size}개 선택됨
              </span>
            </div>

            <ScrollArea className="max-h-[360px]">
              <div className="flex flex-col gap-3 pr-3">
                {Object.entries(groupedItems).map(([groupKey, items]) => {
                  const nodeType = items[0].type
                  const GroupIcon = typeIcon[nodeType]
                  return (
                    <div key={groupKey}>
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <GroupIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {typeDisplayLabel[nodeType]}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        {items.map((item) => (
                          <label
                            key={item.id}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm transition-colors hover:bg-secondary/50',
                              item.disabled && 'cursor-not-allowed opacity-40',
                              selected.has(item.id) && 'border-primary/20 bg-primary/5'
                            )}
                          >
                            <Checkbox
                              checked={selected.has(item.id)}
                              disabled={item.disabled}
                              onCheckedChange={() => toggle(item.id)}
                            />
                            <span className="truncate text-foreground">{item.label}</span>
                            {item.disabled && (
                              <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                                이미 추가됨
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                      <Separator className="mt-2 bg-border" />
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="h-8 rounded-md border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-secondary"
              >
                취소
              </button>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
              >
                {selected.size}개 추가
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
