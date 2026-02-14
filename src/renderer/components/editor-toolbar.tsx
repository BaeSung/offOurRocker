import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading,
  Quote,
  Minus,
  Superscript,
  ImageIcon,
  CheckCheck,
  Maximize,
  Eye,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Download,
  Printer,
  History,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG } from '../../shared/types'
import type { WorkStatus } from '../../shared/types'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { SpellCheckPanel } from '@/components/spell-check-panel'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type EditorMode = 'normal' | 'focus' | 'preview'

interface FormatState {
  bold: boolean
  italic: boolean
  strikethrough: boolean
}

interface EditorToolbarProps {
  mode: EditorMode
  onModeChange: (mode: EditorMode) => void
  workId?: string
  workTitle: string
  chapterTitle: string
  status: WorkStatus
  onStatusChange: (status: WorkStatus) => void
  onWorkTitleChange: (title: string) => void
  onChapterTitleChange: (title: string) => void
  formatState: FormatState
  onFormatToggle: (format: keyof FormatState) => void
  editor?: any // TipTap editor instance
  onVersionHistoryToggle?: () => void
  versionHistoryOpen?: boolean
}

function ToolbarButton({
  icon: Icon,
  label,
  active = false,
  shortcut,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active?: boolean
  shortcut?: string
  onClick?: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded transition-colors duration-150',
            active
              ? 'bg-secondary text-primary'
              : 'text-muted-foreground hover:bg-secondary/50 hover:text-primary'
          )}
          aria-label={label}
          aria-pressed={active}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
        {shortcut && (
          <span className="ml-2 text-muted-foreground">{shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function InlineEdit({
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

function HeadingDropdown({ editor }: { editor?: any }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-7 items-center gap-0.5 rounded px-1.5 text-muted-foreground transition-colors duration-150 hover:bg-secondary/50 hover:text-primary"
              aria-label="제목"
            >
              <Heading className="h-3.5 w-3.5" />
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {'제목'}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="min-w-[120px]">
        <DropdownMenuItem
          className="text-lg font-serif font-bold"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          {'제목 1'}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-base font-serif font-bold"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          {'제목 2'}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-sm font-serif font-bold"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          {'제목 3'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StatusBadge({
  status,
  onStatusChange,
}: {
  status: WorkStatus
  onStatusChange: (s: WorkStatus) => void
}) {
  const config = STATUS_CONFIG[status]
  const statusColors: Record<WorkStatus, string> = {
    writing: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    editing: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    complete: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all duration-200 hover:brightness-110',
            statusColors[status]
          )}
        >
          {config.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[100px]">
        {(Object.keys(STATUS_CONFIG) as WorkStatus[]).map((s) => (
          <DropdownMenuItem key={s} onClick={() => onStatusChange(s)}>
            <span className={cn('mr-2 h-2 w-2 rounded-full', STATUS_CONFIG[s].color)} />
            {STATUS_CONFIG[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MoreMenu({ workId, onVersionHistoryToggle }: { workId?: string; onVersionHistoryToggle?: () => void }) {
  const handleExport = async (format: 'markdown' | 'txt') => {
    if (!workId) return
    try {
      const result = await window.api.export.work(workId, format)
      if (result.success) {
        console.log(`[Export] Saved to: ${result.path}`)
      }
    } catch (err) {
      console.error('Export error:', err)
    }
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-secondary/50 hover:text-primary"
              aria-label="더보기"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {'더보기'}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={() => handleExport('markdown')}>
          <Download className="mr-2 h-3.5 w-3.5" />
          {'마크다운으로 내보내기'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('txt')}>
          <FileText className="mr-2 h-3.5 w-3.5" />
          {'텍스트로 내보내기'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.print()}>
          <Printer className="mr-2 h-3.5 w-3.5" />
          {'인쇄'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onVersionHistoryToggle}>
          <History className="mr-2 h-3.5 w-3.5" />
          {'버전 히스토리'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SpellCheckButton({ editor }: { editor?: any }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [corrections, setCorrections] = useState<{ original: string; corrected: string; explanation: string }[]>([])
  const [error, setError] = useState('')

  const { aiProvider, aiModel } = useSettingsStore()

  const handleSpellCheck = useCallback(async () => {
    if (!editor) return
    if (aiProvider === 'none') {
      setError('AI 설정에서 제공자를 선택하고 API 키를 등록하세요.')
      setPanelOpen(true)
      return
    }

    // Extract plain text from the editor
    const text = editor.getText()
    if (!text || text.trim().length < 5) {
      setError('검사할 텍스트가 충분하지 않습니다.')
      setPanelOpen(true)
      return
    }

    // Limit to ~3000 chars for API efficiency
    const trimmed = text.length > 3000 ? text.slice(0, 3000) : text
    const model = aiModel || (aiProvider === 'openai' ? 'gpt-4o-mini' : 'claude-haiku-4-5-20251001')

    setPanelOpen(true)
    setLoading(true)
    setError('')
    setCorrections([])

    try {
      const result = await window.api.ai.spellCheck(trimmed, aiProvider, model, aiProvider)
      if (result.success && result.corrections) {
        setCorrections(result.corrections)
      } else {
        setError(result.error || '맞춤법 검사에 실패했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '맞춤법 검사에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [editor, aiProvider, aiModel])

  const handleApply = (original: string, corrected: string) => {
    if (!editor) return
    // Use TipTap's search and replace via the editor commands
    const { state } = editor
    const { doc } = state
    const text = doc.textContent
    const idx = text.indexOf(original)
    if (idx === -1) return

    // Find the position in the document
    let pos = 0
    let found = false
    doc.descendants((node: any, nodePos: number) => {
      if (found) return false
      if (node.isText) {
        const nodeText = node.text || ''
        const localIdx = nodeText.indexOf(original)
        if (localIdx !== -1) {
          pos = nodePos + localIdx
          found = true
          return false
        }
      }
    })

    if (found) {
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: pos, to: pos + original.length },
          corrected
        )
        .run()
    }
  }

  const handleApplyAll = () => {
    for (const c of corrections) {
      handleApply(c.original, c.corrected)
    }
  }

  return (
    <div className="relative">
      <ToolbarButton
        icon={CheckCheck}
        label="맞춤법 검사"
        active={panelOpen}
        onClick={handleSpellCheck}
      />
      <SpellCheckPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        loading={loading}
        corrections={corrections}
        error={error}
        onApply={handleApply}
        onApplyAll={handleApplyAll}
      />
    </div>
  )
}

export function EditorToolbar({
  mode,
  onModeChange,
  workId,
  workTitle,
  chapterTitle,
  status,
  onStatusChange,
  onWorkTitleChange,
  onChapterTitleChange,
  formatState,
  onFormatToggle,
  editor,
  onVersionHistoryToggle,
  versionHistoryOpen,
}: EditorToolbarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center border-b border-border/50 px-4">
      {/* Left: Breadcrumb + Status */}
      <div className="flex items-center gap-1.5 overflow-hidden">
        <InlineEdit
          value={workTitle}
          onChange={onWorkTitleChange}
          className="text-xs font-medium max-w-[160px]"
        />
        {chapterTitle && (
          <>
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            <InlineEdit
              value={chapterTitle}
              onChange={onChapterTitleChange}
              className="text-xs font-medium max-w-[200px]"
            />
          </>
        )}
        <StatusBadge status={status} onStatusChange={onStatusChange} />
      </div>

      {/* Center: Formatting tools */}
      <div className="mx-auto flex items-center gap-0.5">
        <ToolbarButton
          icon={Bold}
          label="굵게"
          shortcut="⌘B"
          active={formatState.bold}
          onClick={() => onFormatToggle('bold')}
        />
        <ToolbarButton
          icon={Italic}
          label="기울임"
          shortcut="⌘I"
          active={formatState.italic}
          onClick={() => onFormatToggle('italic')}
        />
        <ToolbarButton
          icon={Strikethrough}
          label="취소선"
          shortcut="⌘D"
          active={formatState.strikethrough}
          onClick={() => onFormatToggle('strikethrough')}
        />

        <div className="mx-1.5 h-4 w-px bg-border" />

        <HeadingDropdown editor={editor} />

        <div className="mx-1.5 h-4 w-px bg-border" />

        <ToolbarButton
          icon={Quote}
          label="인용문"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={Minus}
          label="구분선"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        />
        <ToolbarButton icon={Superscript} label="각주" />

        <div className="mx-1.5 h-4 w-px bg-border" />

        <ToolbarButton icon={ImageIcon} label="삽화 삽입" />
      </div>

      {/* Right: Mode switches + More */}
      <div className="flex items-center gap-0.5">
        <SpellCheckButton editor={editor} />
        <ToolbarButton
          icon={Maximize}
          label="집중 모드"
          shortcut="⌘⇧F"
          active={mode === 'focus'}
          onClick={() => onModeChange(mode === 'focus' ? 'normal' : 'focus')}
        />
        <ToolbarButton
          icon={Eye}
          label="미리보기"
          shortcut="⌘⇧P"
          active={mode === 'preview'}
          onClick={() =>
            onModeChange(mode === 'preview' ? 'normal' : 'preview')
          }
        />
        <MoreMenu workId={workId} onVersionHistoryToggle={onVersionHistoryToggle} />
      </div>
    </div>
  )
}

export function MiniToolbar({
  visible,
  formatState,
  onFormatToggle,
}: {
  visible: boolean
  formatState: FormatState
  onFormatToggle: (format: keyof FormatState) => void
}) {
  return (
    <div
      className={cn(
        'absolute left-1/2 top-0 z-50 -translate-x-1/2 transition-all duration-300',
        visible ? 'translate-y-3 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-card/95 px-2 py-1 shadow-lg backdrop-blur-sm">
        <ToolbarButton
          icon={Bold}
          label="굵게"
          active={formatState.bold}
          onClick={() => onFormatToggle('bold')}
        />
        <ToolbarButton
          icon={Italic}
          label="기울임"
          active={formatState.italic}
          onClick={() => onFormatToggle('italic')}
        />
        <ToolbarButton
          icon={Strikethrough}
          label="취소선"
          active={formatState.strikethrough}
          onClick={() => onFormatToggle('strikethrough')}
        />
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton icon={Quote} label="인용문" />
        <ToolbarButton icon={Minus} label="구분선" />
      </div>
    </div>
  )
}
