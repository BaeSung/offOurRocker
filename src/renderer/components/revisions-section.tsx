import { useCallback, useEffect, useState } from 'react'
import { BookCheck, GitCompare, Loader2, Plus, Trash2 } from 'lucide-react'
import type { Revision } from '@/lib/electron'
import { useAppStore } from '@/stores/useAppStore'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface RevisionsSectionProps {
  workId: string
}

export function RevisionsSection({ workId }: RevisionsSectionProps) {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const openRevisionCompare = useAppStore((s) => s.openRevisionCompare)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.revisions.list(workId)
      setRevisions(list)
    } finally {
      setLoading(false)
    }
  }, [workId])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const result = await window.api.revisions.create(workId, {
        label: label.trim() || undefined,
        note: note.trim() || undefined,
      })
      if (result.success) {
        toast({ title: `${result.roundNumber}회차로 저장되었습니다.` })
        setModalOpen(false)
        setLabel('')
        setNote('')
        load()
      } else {
        toast({ title: '저장 실패', description: result.error, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, round: number) => {
    if (!confirm(`${round}회차를 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return
    await window.api.revisions.delete(id)
    load()
  }

  const latest = revisions[0]

  return (
    <div className="mt-4 border-t border-border/50 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          탈고 회차
        </p>
        <button
          onClick={() => setModalOpen(true)}
          className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="회차 마감"
          title="회차 마감"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </div>
      ) : revisions.length === 0 ? (
        <p className="py-2 text-[11px] text-muted-foreground">
          저장된 회차가 없습니다.
        </p>
      ) : (
        <>
          <div className="mb-2 rounded-md bg-secondary/50 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <BookCheck className="h-3 w-3 text-foreground" />
              <span className="text-[11px] font-medium text-foreground">
                현재 {latest.roundNumber}회차 완료
              </span>
            </div>
          </div>

          <button
            onClick={() => openRevisionCompare(workId, null, null)}
            className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            disabled={revisions.length < 1}
          >
            <GitCompare className="h-3 w-3" />
            회차 비교 열기
          </button>

          <ul className="space-y-1 overflow-y-auto" style={{ maxHeight: 180 }}>
            {revisions.map((r) => (
              <li
                key={r.id}
                className="group flex items-center justify-between gap-1 rounded px-1.5 py-1 text-[11px] hover:bg-secondary/60"
              >
                <button
                  onClick={() => openRevisionCompare(workId, null, r.id)}
                  className="flex-1 text-left"
                  title="이 회차와 비교"
                >
                  <span className="font-medium text-foreground">{r.roundNumber}회차</span>
                  {r.label && <span className="ml-1 text-muted-foreground">· {r.label}</span>}
                  <div className="text-[10px] text-muted-foreground">
                    {formatDate(r.createdAt)} · {r.totalCharCount.toLocaleString()}자
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(r.id, r.roundNumber)}
                  className="hidden h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive group-hover:flex"
                  aria-label="회차 삭제"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>탈고 회차 마감</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              현재 전 챕터의 스냅샷을 {revisions.length > 0 ? revisions[0].roundNumber + 1 : 1}회차로 저장합니다.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                라벨 (선택)
              </label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="예: 초고 완성, 1차 퇴고"
                maxLength={50}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-foreground">
                메모 (선택)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="이 회차에 대한 메모"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? '저장 중...' : '회차 저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
