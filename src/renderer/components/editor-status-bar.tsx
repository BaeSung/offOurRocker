import { useState } from 'react'
import { useEditorStore } from '@/stores/useEditorStore'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

export function EditorStatusBar() {
  const [includeSpaces, setIncludeSpaces] = useState(false)
  const { charCount, charCountNoSpaces, cursorLine, cursorCol, isDirty, lastSavedAt } =
    useEditorStore()

  const displayCount = includeSpaces ? charCount : charCountNoSpaces
  const manuscriptPages = Math.ceil(charCountNoSpaces / 200)
  const readingMin = Math.max(1, Math.round(charCountNoSpaces / 2800))

  const savedText = (() => {
    if (isDirty) return '수정됨'
    if (!lastSavedAt) return ''
    try {
      return `자동저장됨 · ${formatDistanceToNow(new Date(lastSavedAt), { locale: ko, addSuffix: true })}`
    } catch {
      return '자동저장됨'
    }
  })()

  return (
    <div className="flex h-8 shrink-0 items-center border-t border-border/50 bg-card/30 px-4 text-[11px] text-muted-foreground">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIncludeSpaces(!includeSpaces)}
          className="transition-colors duration-150 hover:text-foreground"
          aria-label={includeSpaces ? '공백 제외 글자수로 전환' : '공백 포함 글자수로 전환'}
        >
          {displayCount.toLocaleString()}
          {'자'}
          <span className="ml-0.5 text-muted-foreground/60">
            {'('}
            {includeSpaces ? '공백 포함' : '공백 제외'}
            {')'}
          </span>
        </button>
        <span className="text-border">{'·'}</span>
        <span>
          {'약 '}
          {manuscriptPages}
          {'매'}
        </span>
        {savedText && (
          <>
            <span className="text-border">{'·'}</span>
            <span className="flex items-center gap-1">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isDirty ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              {savedText}
            </span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-3">
        <span>
          {'줄 '}
          {cursorLine}
          {', 열 '}
          {cursorCol}
        </span>
        <span className="text-border">{'·'}</span>
        <span>
          {'약 '}
          {readingMin}
          {'분'}
        </span>
      </div>
    </div>
  )
}

export function FocusStatusBar({ charCount }: { charCount: number }) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground/40">
      {charCount.toLocaleString()}
      {'자'}
    </div>
  )
}
