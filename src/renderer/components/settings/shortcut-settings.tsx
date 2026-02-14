import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { DEFAULT_SETTINGS } from '../../../shared/types'

interface ShortcutDef {
  id: string
  label: string
}

const SHORTCUT_DEFS: ShortcutDef[] = [
  { id: 'new', label: '새 작품' },
  { id: 'save', label: '저장' },
  { id: 'search', label: '검색' },
  { id: 'focus', label: '집중 모드' },
  { id: 'preview', label: '미리보기' },
  { id: 'bold', label: '굵게' },
  { id: 'italic', label: '기울임' },
  { id: 'strike', label: '취소선' },
  { id: 'spell', label: '맞춤법 검사' },
  { id: 'settings', label: '설정' },
]

function KeyBadge({ text }: { text: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-border bg-secondary/60 px-1.5 text-[11px] font-medium text-secondary-foreground">
      {text}
    </kbd>
  )
}

function ShortcutKeys({ keys }: { keys: string }) {
  const parts = keys.split('+')
  return (
    <div className="flex items-center gap-1">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
          <KeyBadge text={part} />
        </span>
      ))}
    </div>
  )
}

export function ShortcutSettings() {
  const shortcuts = useSettingsStore((s) => s.shortcuts)
  const setSetting = useSettingsStore((s) => s.setSetting)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleKeyCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!editingId) return
      e.preventDefault()
      e.stopPropagation()

      const keys: string[] = []
      if (e.ctrlKey || e.metaKey) keys.push('Ctrl')
      if (e.shiftKey) keys.push('Shift')
      if (e.altKey) keys.push('Alt')

      const key = e.key
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
        keys.push(key.length === 1 ? key.toUpperCase() : key)
        const combo = keys.join('+')
        const updated = { ...shortcuts, [editingId]: combo }
        setSetting('shortcuts', updated)
        setEditingId(null)
      }
    },
    [editingId, shortcuts, setSetting]
  )

  useEffect(() => {
    if (editingId) {
      window.addEventListener('keydown', handleKeyCapture, true)
      return () => window.removeEventListener('keydown', handleKeyCapture, true)
    }
  }, [editingId, handleKeyCapture])

  const handleReset = () => {
    setSetting('shortcuts', DEFAULT_SETTINGS.shortcuts)
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="text-sm font-semibold text-foreground">단축키</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          단축키를 클릭하면 새로운 키 조합을 입력할 수 있습니다.
        </p>
      </section>

      <div className="overflow-hidden rounded-lg border border-border">
        {/* Header */}
        <div className="flex items-center border-b border-border bg-secondary/30 px-4 py-2">
          <span className="w-1/2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            기능
          </span>
          <span className="w-1/2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            단축키
          </span>
        </div>

        {/* Rows */}
        {SHORTCUT_DEFS.map((def, i) => (
          <div
            key={def.id}
            className={cn(
              'flex items-center px-4 py-2.5 transition-colors hover:bg-secondary/20',
              i < SHORTCUT_DEFS.length - 1 && 'border-b border-border/50'
            )}
          >
            <span className="w-1/2 text-sm text-foreground">{def.label}</span>
            <div className="w-1/2">
              {editingId === def.id ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 items-center rounded-md border border-primary bg-primary/10 px-3">
                    <span className="animate-pulse text-xs text-primary">키 입력 대기중...</span>
                  </div>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingId(def.id)}
                  className="group rounded-md p-1 transition-colors hover:bg-secondary/60"
                  aria-label={`${def.label} 단축키 변경`}
                >
                  <ShortcutKeys keys={shortcuts[def.id] || DEFAULT_SETTINGS.shortcuts[def.id] || ''} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleReset}
        className="h-8 w-fit rounded-md border border-border px-4 text-xs text-secondary-foreground transition-colors hover:bg-secondary"
      >
        기본값으로 초기화
      </button>
    </div>
  )
}
