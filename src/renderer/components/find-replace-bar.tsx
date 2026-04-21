import { useEffect, useRef, useState } from 'react'
import { ChevronUp, ChevronDown, X, Replace, ReplaceAll } from 'lucide-react'
import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import {
  findReplaceKey,
  setFindQuery,
  clearFind,
  findNext,
  findPrev,
  replaceCurrent,
  replaceAll,
} from '@/components/editor/find-replace'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

interface FindReplaceBarProps {
  editor: Editor | null
  open: boolean
  mode: 'find' | 'replace'
  focusNonce: number
  onClose: () => void
}

export function FindReplaceBar({
  editor,
  open,
  mode,
  focusNonce,
  onClose,
}: FindReplaceBarProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const queryInputRef = useRef<HTMLInputElement>(null)

  const findInfoRaw = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { total: 0, active: -1 }
      const s = findReplaceKey.getState(e.state)
      return s ? { total: s.matches.length, active: s.activeIdx } : { total: 0, active: -1 }
    },
  })
  const findInfo = findInfoRaw ?? { total: 0, active: -1 }

  useEffect(() => {
    if (!editor) return
    if (open) {
      setFindQuery(editor, query, caseSensitive)
    } else {
      clearFind(editor)
    }
  }, [open, query, caseSensitive, editor])

  useEffect(() => {
    if (open && queryInputRef.current) {
      queryInputRef.current.focus()
      queryInputRef.current.select()
    }
  }, [open, mode, focusNonce])

  if (!open || !editor) return null

  const handleQueryKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (findInfo.total === 0) return
      if (e.shiftKey) findPrev(editor)
      else findNext(editor)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleReplaceKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (findInfo.total === 0) return
      if (e.shiftKey) {
        const n = replaceAll(editor, replacement)
        if (n > 0) toast({ description: `${n}개 항목을 바꿨습니다.` })
      } else {
        replaceCurrent(editor, replacement)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleReplaceAll = () => {
    if (findInfo.total === 0) return
    const n = replaceAll(editor, replacement)
    if (n > 0) toast({ description: `${n}개 항목을 바꿨습니다.` })
  }

  const counter =
    findInfo.total === 0
      ? query
        ? '일치 없음'
        : ''
      : `${findInfo.active + 1} / ${findInfo.total}`

  return (
    <div className="absolute right-6 top-14 z-30 flex flex-col gap-1 rounded-lg border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <input
          ref={queryInputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleQueryKey}
          placeholder="찾기"
          className="h-7 w-52 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
        />
        <span className="w-14 shrink-0 text-center text-[10px] text-muted-foreground">
          {counter}
        </span>
        <button
          onClick={() => findPrev(editor)}
          disabled={findInfo.total === 0}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground disabled:opacity-40"
          title="이전 (Shift+Enter)"
          aria-label="이전"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => findNext(editor)}
          disabled={findInfo.total === 0}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground disabled:opacity-40"
          title="다음 (Enter)"
          aria-label="다음"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setCaseSensitive((v) => !v)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded font-mono text-[10px] transition-colors hover:bg-secondary/50',
            caseSensitive
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="대소문자 구분"
          aria-label="대소문자 구분"
          aria-pressed={caseSensitive}
        >
          Aa
        </button>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          title="닫기 (Esc)"
          aria-label="닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {mode === 'replace' && (
        <div className="flex items-center gap-1">
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={handleReplaceKey}
            placeholder="바꾸기"
            className="h-7 w-52 rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
          <span className="w-14 shrink-0" />
          <button
            onClick={() => replaceCurrent(editor, replacement)}
            disabled={findInfo.total === 0}
            className="flex h-7 items-center gap-1 rounded px-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground disabled:opacity-40"
            title="현재 항목 바꾸기 (Enter)"
          >
            <Replace className="h-3 w-3" />
            바꾸기
          </button>
          <button
            onClick={handleReplaceAll}
            disabled={findInfo.total === 0}
            className="flex h-7 items-center gap-1 rounded px-2 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground disabled:opacity-40"
            title="모두 바꾸기 (Shift+Enter)"
          >
            <ReplaceAll className="h-3 w-3" />
            모두
          </button>
        </div>
      )}
    </div>
  )
}
