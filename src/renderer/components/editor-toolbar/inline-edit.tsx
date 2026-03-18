import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function InlineEdit({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft)
          setEditing(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onChange(draft)
            setEditing(false)
          }
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        className={cn(
          'bg-transparent border-b border-primary/50 outline-none text-foreground px-0 py-0',
          className
        )}
        style={{ width: `${Math.max(draft.length, 2)}ch` }}
      />
    )
  }

  return (
    <button
      onClick={() => {
        setDraft(value)
        setEditing(true)
      }}
      className={cn(
        'text-foreground hover:text-primary transition-colors duration-150 cursor-text truncate',
        className
      )}
    >
      {value}
    </button>
  )
}
