import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type { Character, CharacterRole } from '../../../shared/types'
import { CHARACTER_ROLES } from './constants'

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

export function CharactersTab({ workId }: { workId: string }) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

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

      <div className="flex-1 overflow-y-auto scrollbar-thin">
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

      {isFormOpen && (
        <div className="shrink-0 border-t border-border bg-card p-4">
          <div className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">이름</label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="인물 이름"
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">역할</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as CharacterRole)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
              >
                {CHARACTER_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">설명</label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="외모, 성격, 배경 등 자유 서술"
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
