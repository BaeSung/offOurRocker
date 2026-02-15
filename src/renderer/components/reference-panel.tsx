import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Users,
  Globe,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { Character, CharacterRole, WorldNote, WorldNoteCategory } from '../../shared/types'

type TabType = 'characters' | 'worldNotes'

interface ReferencePanelProps {
  open: boolean
  onClose: () => void
  workId: string | null
}

const CHARACTER_ROLES: { value: CharacterRole; label: string; color: string }[] = [
  { value: '주인공', label: '주인공', color: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
  { value: '조연', label: '조연', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  { value: '악역', label: '악역', color: 'bg-red-500/15 text-red-400 border-red-500/25' },
  { value: '기타', label: '기타', color: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/25' },
]

const WORLD_NOTE_CATEGORIES: { value: WorldNoteCategory; label: string; color: string }[] = [
  { value: '장소', label: '장소', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
  { value: '세력', label: '세력', color: 'bg-violet-500/15 text-violet-400 border-violet-500/25' },
  { value: '설정', label: '설정', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25' },
  { value: '역사', label: '역사', color: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
  { value: '기타', label: '기타', color: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/25' },
]

function RoleBadge({ role }: { role: CharacterRole }) {
  const config = CHARACTER_ROLES.find((r) => r.value === role) || CHARACTER_ROLES[3]
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

/* ── Characters Tab ── */

function CharactersTab({ workId }: { workId: string }) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formRole, setFormRole] = useState<CharacterRole>('기타')
  const [formDesc, setFormDesc] = useState('')

  const loadCharacters = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.api.characters.getByWork(workId)
      setCharacters(result)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [workId])

  useEffect(() => {
    loadCharacters()
  }, [loadCharacters])

  const resetForm = () => {
    setFormName('')
    setFormRole('기타')
    setFormDesc('')
    setEditingId(null)
    setIsCreating(false)
  }

  const startCreate = () => {
    resetForm()
    setIsCreating(true)
  }

  const startEdit = (ch: Character) => {
    setFormName(ch.name)
    setFormRole(ch.role)
    setFormDesc(ch.description || '')
    setEditingId(ch.id)
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast({ description: '이름을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
      if (isCreating) {
        await window.api.characters.create({
          workId,
          name: formName.trim(),
          role: formRole,
          description: formDesc.trim() || undefined,
        })
        toast({ description: '인물이 추가되었습니다.' })
      } else if (editingId) {
        await window.api.characters.update(editingId, {
          name: formName.trim(),
          role: formRole,
          description: formDesc.trim() || undefined,
        })
        toast({ description: '인물 정보가 수정되었습니다.' })
      }
      resetForm()
      await loadCharacters()
    } catch {
      toast({ description: '저장에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await window.api.characters.delete(id)
      setCharacters((prev) => prev.filter((c) => c.id !== id))
      if (editingId === id) resetForm()
      toast({ description: '인물이 삭제되었습니다.' })
    } catch {
      toast({ description: '삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  const isFormOpen = isCreating || editingId !== null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Add button */}
      <div className="shrink-0 px-3 py-2">
        <button
          onClick={startCreate}
          disabled={isCreating}
          className="flex h-7 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          인물 추가
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {!loading && characters.length === 0 && !isFormOpen && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <UserCircle className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">등장인물을 추가해보세요</p>
          </div>
        )}

        {!loading &&
          characters.map((ch) => (
            <div
              key={ch.id}
              className={cn(
                'group flex flex-col gap-1 border-b border-border/50 px-3 py-2.5 transition-colors',
                editingId === ch.id ? 'bg-secondary' : 'hover:bg-secondary/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{ch.name}</span>
                  <RoleBadge role={ch.role} />
                </div>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => startEdit(ch)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    title="편집"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="삭제"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
              {ch.description && (
                <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                  {ch.description}
                </p>
              )}
            </div>
          ))}
      </div>

      {/* Edit / Create form */}
      {isFormOpen && (
        <div className="shrink-0 border-t border-border bg-card p-3">
          <div className="flex flex-col gap-2">
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="인물 이름"
              className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
              autoFocus
            />
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value as CharacterRole)}
              className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
            >
              {CHARACTER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              placeholder="외모, 성격, 배경 등 자유 서술"
              rows={3}
              className="resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs leading-relaxed text-foreground outline-none focus:border-primary/50"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={resetForm}
                className="h-6 rounded-md px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="h-6 rounded-md bg-primary/10 px-2.5 text-[11px] font-medium text-primary hover:bg-primary/20"
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

/* ── World Notes Tab ── */

function WorldNotesTab({ workId }: { workId: string }) {
  const [notes, setNotes] = useState<WorldNote[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
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
      {/* Add button */}
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

      {/* List */}
      <div className="flex-1 overflow-y-auto">
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

      {/* Edit / Create form */}
      {isFormOpen && (
        <div className="shrink-0 border-t border-border bg-card p-3">
          <div className="flex flex-col gap-2">
            <input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="항목 제목"
              className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
              autoFocus
            />
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as WorldNoteCategory)}
              className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50"
            >
              {WORLD_NOTE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="상세 내용"
              rows={4}
              className="resize-none rounded-md border border-border bg-background px-2 py-1.5 text-xs leading-relaxed text-foreground outline-none focus:border-primary/50"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={resetForm}
                className="h-6 rounded-md px-2.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                className="h-6 rounded-md bg-primary/10 px-2.5 text-[11px] font-medium text-primary hover:bg-primary/20"
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

/* ── Main Reference Panel ── */

export function ReferencePanel({ open, onClose, workId }: ReferencePanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('characters')

  if (!open) return null

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-border bg-card">
      {/* Header with tabs */}
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
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tab content */}
      {workId ? (
        activeTab === 'characters' ? (
          <CharactersTab workId={workId} />
        ) : (
          <WorldNotesTab workId={workId} />
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
