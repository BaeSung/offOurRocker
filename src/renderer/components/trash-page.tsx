import { useState, useEffect, useCallback } from 'react'
import { Trash2, RotateCcw, AlertTriangle, FileText, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GENRE_CONFIG } from '../../shared/types'
import type { Genre } from '../../shared/types'
import { useWorkStore } from '@/stores/useWorkStore'
import { toast } from '@/hooks/use-toast'
import type { TrashItem } from '@/lib/electron'

function formatDeletedDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const loadTrash = useCallback(async () => {
    try {
      const result = await window.api.trash.list()
      setItems(result)
    } catch {
      // load failed silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrash()
  }, [loadTrash])

  const handleRestore = async (workId: string) => {
    try {
      await window.api.trash.restore(workId)
      setItems((prev) => prev.filter((i) => i.id !== workId))
      useWorkStore.getState().loadAll()
      toast({ description: '작품이 복원되었습니다.' })
    } catch (err) {
      toast({ description: '복원에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handlePermanentDelete = async (workId: string) => {
    try {
      await window.api.trash.permanentDelete(workId)
      setItems((prev) => prev.filter((i) => i.id !== workId))
      toast({ description: '영구 삭제되었습니다.' })
    } catch (err) {
      toast({ description: '삭제에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleEmptyTrash = async () => {
    try {
      await window.api.trash.empty()
      setItems([])
      setConfirmEmpty(false)
      toast({ description: '휴지통을 비웠습니다.' })
    } catch (err) {
      toast({ description: '휴지통 비우기에 실패했습니다.', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-base font-semibold text-foreground">휴지통</h1>
            <p className="text-xs text-muted-foreground">
              삭제된 작품은 영구 삭제 전까지 복원할 수 있습니다.
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <div>
            {confirmEmpty ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive">정말 모두 삭제하시겠습니까?</span>
                <button
                  onClick={handleEmptyTrash}
                  className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
                >
                  확인
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-3 w-3" />
                휴지통 비우기
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Trash2 className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">
              휴지통이 비어있습니다.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="flex flex-col gap-2">
            {items.map((item) => {
              const genreConfig = GENRE_CONFIG[item.genre as Genre]
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg border border-border bg-card/50 px-4 py-3 transition-colors hover:bg-card"
                >
                  {/* Icon */}
                  <div className="shrink-0 text-muted-foreground">
                    {item.type === 'novel' ? (
                      <BookOpen className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      {genreConfig && (
                        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px]', genreConfig.color)}>
                          {genreConfig.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{item.type === 'novel' ? '장편' : '단편'}</span>
                      <span>{item.charCount.toLocaleString()}자</span>
                      {item.deletedAt && (
                        <span>삭제: {formatDeletedDate(item.deletedAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleRestore(item.id)}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary"
                    >
                      <RotateCcw className="h-3 w-3" />
                      복원
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item.id)}
                      className="flex items-center gap-1.5 rounded-md border border-destructive/30 px-3 py-1.5 text-xs text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      영구 삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Warning */}
      {items.length > 0 && (
        <div className="shrink-0 border-t border-border px-6 py-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            영구 삭제된 작품은 복구할 수 없습니다.
          </div>
        </div>
      )}
    </div>
  )
}
