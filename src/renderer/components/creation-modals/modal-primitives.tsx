import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

export function ModalOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setVisible(true)
      requestAnimationFrame(() => setAnimating(true))
    } else {
      setAnimating(false)
      const t = setTimeout(() => setVisible(false), 250)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!visible) return null

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center transition-all duration-200',
        animating ? 'bg-black/60 backdrop-blur-[4px]' : 'bg-black/0 backdrop-blur-0'
      )}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          animating
            ? 'scale-100 opacity-100'
            : 'scale-95 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[13px] font-medium text-foreground">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  error,
  inputRef,
  suffix,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoFocus?: boolean
  error?: boolean
  inputRef?: React.RefObject<HTMLInputElement | null>
  suffix?: string
}) {
  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-150',
          'focus:border-primary focus:ring-1 focus:ring-primary/30',
          error
            ? 'animate-[shake_0.3s_ease-in-out] border-destructive focus:border-destructive focus:ring-destructive/30'
            : 'border-border'
        )}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}
