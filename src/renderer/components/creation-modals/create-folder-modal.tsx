import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkStore } from '@/stores/useWorkStore'
import { ModalOverlay, FieldLabel, TextInput } from './modal-primitives'

export function CreateFolderModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [nameErrorMsg, setNameErrorMsg] = useState('')
  const [creating, setCreating] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const { createFolder } = useWorkStore()

  useEffect(() => {
    if (open) {
      setName('')
      setNameError(false)
      setNameErrorMsg('')
      setCreating(false)
    }
  }, [open])

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setNameError(true)
      setNameErrorMsg('폴더 이름을 입력해주세요')
      nameRef.current?.focus()
      return
    }
    if (creating) return
    setCreating(true)
    try {
      await createFolder({ title: name.trim() })
      onClose()
      toast({ description: `'${name.trim()}' 폴더가 생성되었습니다.` })
    } catch {
      toast({ description: '폴더 생성에 실패했습니다.', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }, [name, onClose, createFolder, creating])

  return (
    <ModalOverlay open={open} onClose={onClose}>
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">새 폴더 만들기</h2>
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
            <FieldLabel required>폴더명</FieldLabel>
            <TextInput
              inputRef={nameRef}
              value={name}
              onChange={(v) => {
                setName(v)
                if (v.trim()) { setNameError(false); setNameErrorMsg('') }
              }}
              placeholder="폴더 이름을 입력하세요"
              autoFocus
              error={nameError}
            />
            {nameErrorMsg && (
              <p className="mt-1 text-xs text-destructive">{nameErrorMsg}</p>
            )}
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
