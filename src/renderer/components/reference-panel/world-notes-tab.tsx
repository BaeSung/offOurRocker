import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { WorldNote, WorldNoteCategory } from '../../../shared/types'
import { WORLD_NOTE_CATEGORIES } from './constants'

function CategoryBadge({ category }: { category: WorldNoteCategory }) {
  const config = WORLD_NOTE_CATEGORIES.find((c) => c.value === category) || WORLD_NOTE_CATEGORIES[4]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-medium',
        config.color
      )}
    >
      {config.label}
    </span>
  )
}

export function WorldNotesTab({ workId }: { workId: string }) {
  const [notes, setNotes] = useState<WorldNote[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState<WorldNoteCategory>('기타')
  const [formContent, setFormContent] = useState('')

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.worldNotes.getByWork(workId)
      setNotes(result)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [workId])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const resetForm = () => {
    setFormTitle('')
    setFormCategory('기타')
    setFormContent('')
    setEditingId(null)
    setIsCreating(false)
  }

  const startCreate = () => {
    resetForm()
    setIsCreating(true)
  }

  const startEdit = (note: WorldNote) => {
    setFormTitle(note.title)
    setFormCategory(note.category)
    setFormContent(note.content || '')
    setEditingId(note.id)
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ description: '제목을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
      if (isCreating) {
        await window.api.worldNotes.create({
          workId,
          category: formCategory,
          title: formTitle.trim(),
          content: formContent.trim() || undefined,
        })
        toast({ description: '세계관 메모가 추가되었습니다.' })
      } else if (editingId) {
        await window.api.worldNotes.update(editingId, {
          category: formCategory,
          title: formTitle.trim(),
          content: formContent.trim() || undefined,
        })
        toast({ description: '세계관 메모가 수정되었습니다.' })
      }
      resetForm()
      await loadNotes()
    } catch {
      toast({ description: '저장에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.worldNotes.delete(id)
      setNotes((prev) => prev.filter((n) => n.id !== id))
      if (editingId === id) resetForm()
      toast({ description: '세계관 메모가 삭제되었습니다.' })
    } catch {
      toast({ description: '삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  const isFormOpen = isCreating || editingId !== null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 py-2">
        <button
          onClick={startCreate}
          disabled={isCreating}
          className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          항목 추가
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {!loading && notes.length === 0 && !isFormOpen && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Globe className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">세계관 설정을 기록해보세요</p>
          </div>
        )}

        {!loading &&
          notes.map((note) => (
            <div
              key={note.id}
              className={cn(
                'group flex flex-col gap-1 border-b border-border/50 px-3 py-2.5 transition-colors',
                editingId === note.id ? 'bg-secondary' : 'hover:bg-secondary/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{note.title}</span>
                  <CategoryBadge category={note.category} />
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => startEdit(note)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    title="편집"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="삭제"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
              {note.content && (
                <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {note.content}
                </p>
              )}
            </div>
          ))}
      </div>

      {isFormOpen && (
        <div className="shrink-0 border-t border-border bg-card p-4">
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">제목</label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="항목 제목"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">분류</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as WorldNoteCategory)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
              >
                {WORLD_NOTE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">내용</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="상세 내용"
                rows={4}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={resetForm}
                className="h-8 rounded-lg px-3.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="h-8 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
