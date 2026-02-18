import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkStore } from '@/stores/useWorkStore'
import { ModalOverlay, FieldLabel, TextInput } from './modal-primitives'

export function CreateSeriesModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [nameErrorMsg, setNameErrorMsg] = useState('')
  const [desc, setDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const { createSeries } = useWorkStore()

  useEffect(() => {
    if (open) {
      setName('')
      setNameError(false)
      setNameErrorMsg('')
      setDesc('')
      setCreating(false)
    }
  }, [open])

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setNameError(true)
      setNameErrorMsg('시리즈 이름을 입력해주세요')
      nameRef.current?.focus()
      return
    }
    if (creating) return
    setCreating(true)
    try {
      await createSeries({
        title: name.trim(),
        description: desc.trim() || undefined,
      })
      onClose()
      toast({ description: `'${name.trim()}' 시리즈가 생성되었습니다.` })
    } catch {
      toast({ description: '시리즈 생성에 실패했습니다.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }, [name, desc, onClose, createSeries, creating])

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">새 시리즈 만들기</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div>
            <FieldLabel required>시리즈명</FieldLabel>
            <TextInput
              inputRef={nameRef}
              value={name}
              onChange={(v) => {
                setName(v)
                if (v.trim()) { setNameError(false); setNameErrorMsg('') }
              }}
              placeholder="시리즈 이름을 입력하세요"
              autoFocus
              error={nameError}
            />
            {nameErrorMsg && (
              <p className="mt-1 text-xs text-destructive">{nameErrorMsg}</p>
            )}
          </div>

          <div>
            <FieldLabel>설명</FieldLabel>
            <div className="relative">
              <textarea
                value={desc}
                onChange={(e) => {
                  if (e.target.value.length <= 200) setDesc(e.target.value)
                }}
                placeholder="시리즈에 대한 간단한 설명"
                rows={3}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              <span className="absolute bottom-2 right-3 text-[11px] tabular-nums text-muted-foreground">
                {desc.length} / 200
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="h-9 rounded-lg border border-primary/40 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            {'취소'}
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className={cn(
              'h-9 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]',
              (creating || !name.trim()) && 'opacity-60'
            )}
          >
            {creating ? '생성 중...' : '만들기'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}
