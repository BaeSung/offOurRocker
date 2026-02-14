import { useState, useEffect, useCallback } from 'react'
import { History, RotateCcw, Trash2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/useAppStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { toast } from '@/hooks/use-toast'

interface Version {
  id: string
  chapterId: string
  content: string
  charCount: number
  label: string | null
  createdAt: string
}

function formatVersionDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}시간 전`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`

  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface VersionHistoryPanelProps {
  open: boolean
  onClose: () => void
  chapterId: string | null
  onContentRestored?: () => void
}

export function VersionHistoryPanel({ open, onClose, chapterId, onContentRestored }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const loadVersions = useCallback(async () => {
    if (!chapterId) return
    setLoading(true)
    try {
      const result = await window.api.versions.list(chapterId)
      setVersions(result)
    } catch (err) {
      console.error('Failed to load versions:', err)
    } finally {
      setLoading(false)
    }
  }, [chapterId])

  useEffect(() => {
    if (open && chapterId) {
      loadVersions()
    }
  }, [open, chapterId, loadVersions])

  const handleCreateSnapshot = async () => {
    if (!chapterId) return
    setSaving(true)
    try {
      await window.api.versions.create(chapterId)
      await loadVersions()
      toast({ description: '스냅샷이 생성되었습니다.' })
    } catch (err) {
      toast({ description: '스냅샷 생성에 실패했습니다.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (versionId: string) => {
    try {
      const result = await window.api.versions.restore(versionId)
      if (result.success) {
        await loadVersions()
        onContentRestored?.()
        toast({ description: '버전이 복원되었습니다.' })
      }
    } catch (err) {
      toast({ description: '버전 복원에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleDelete = async (versionId: string) => {
    try {
      await window.api.versions.delete(versionId)
      setVersions((prev) => prev.filter((v) => v.id !== versionId))
      if (previewId === versionId) setPreviewId(null)
    } catch (err) {
      toast({ description: '버전 삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  const previewVersion = versions.find((v) => v.id === previewId)

  if (!open) return null

  return (
    <div className="flex h-full w-[320px] shrink-0 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground">버전 히스토리</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateSnapshot}
            disabled={saving || !chapterId}
            className="flex h-6 items-center gap-1 rounded-md bg-primary/10 px-2 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
          >
            <Plus className="h-3 w-3" />
            스냅샷
          </button>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Version list */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {!loading && !chapterId && (
          <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground">
            챕터를 선택해주세요.
          </div>
        )}

        {!loading && chapterId && versions.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <History className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">저장된 버전이 없습니다.</p>
            <p className="text-[10px] text-muted-foreground/60">
              "스냅샷" 버튼으로 현재 상태를 저장하세요.
            </p>
          </div>
        )}

        {!loading && versions.length > 0 && (
          <div className="flex flex-col">
            {versions.map((v, idx) => (
              <div
                key={v.id}
                className={cn(
                  'group flex flex-col gap-1 border-b border-border/50 px-4 py-3 transition-colors',
                  previewId === v.id ? 'bg-secondary' : 'hover:bg-secondary/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {v.label || `버전 ${versions.length - idx}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleRestore(v.id)}
                      className="flex h-5 items-center gap-1 rounded px-1.5 text-[10px] text-primary hover:bg-primary/10"
                      title="이 버전으로 복원"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      복원
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="삭제"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>{formatVersionDate(v.createdAt)}</span>
                  <span>{v.charCount.toLocaleString()}자</span>
                </div>
                <button
                  onClick={() => setPreviewId(previewId === v.id ? null : v.id)}
                  className="mt-1 text-left text-[10px] text-primary/70 hover:text-primary"
                >
                  {previewId === v.id ? '미리보기 닫기' : '미리보기'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview area */}
      {previewVersion && (
        <div className="shrink-0 border-t border-border">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[10px] font-medium text-muted-foreground">미리보기</span>
            <button
              onClick={() => setPreviewId(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              닫기
            </button>
          </div>
          <div
            className="max-h-[200px] overflow-y-auto px-4 pb-3 text-xs leading-relaxed text-foreground/80"
            dangerouslySetInnerHTML={{ __html: previewVersion.content }}
          />
        </div>
      )}
    </div>
  )
}
