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
  BookMarked,
  BookOpen,
  X,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG } from '../../shared/types'
import type { WorkStatus } from '../../shared/types'
import type { Editor } from '@tiptap/react'
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
import { toast } from '@/hooks/use-toast'

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
  editor?: Editor | null
  onVersionHistoryToggle?: () => void
  versionHistoryOpen?: boolean
  onReferencePanelToggle?: () => void
  referencePanelOpen?: boolean
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

function HeadingDropdown({ editor }: { editor?: Editor | null }) {
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
  const coverInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async (format: 'markdown' | 'txt' | 'epub') => {
    if (!workId) return
    try {
      const result = await window.api.export.work(workId, format)
      if (result.success) {
        toast({ description: '내보내기가 완료되었습니다.' })
      } else {
        toast({ description: result.error || '내보내기에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: '내보내기에 실패했습니다.', variant: 'destructive' })
    }
  }

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !workId) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      // Resize to max 400px width to keep DB size reasonable
      const img = new Image()
      img.onload = async () => {
        const maxW = 400
        const scale = Math.min(1, maxW / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        const resized = canvas.toDataURL('image/jpeg', 0.8)
        await window.api.works.update(workId, { coverImage: resized })
        toast({ description: '표지가 설정되었습니다.' })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemoveCover = async () => {
    if (!workId) return
    await window.api.works.update(workId, { coverImage: null })
    toast({ description: '표지가 제거되었습니다.' })
  }

  return (
    <>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverUpload}
      />
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
          <DropdownMenuItem onClick={() => coverInputRef.current?.click()}>
            <ImageIcon className="mr-2 h-3.5 w-3.5" />
            {'표지 업로드'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRemoveCover}>
            <X className="mr-2 h-3.5 w-3.5" />
            {'표지 제거'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleExport('markdown')}>
            <Download className="mr-2 h-3.5 w-3.5" />
            {'마크다운으로 내보내기'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('txt')}>
            <FileText className="mr-2 h-3.5 w-3.5" />
            {'텍스트로 내보내기'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('epub')}>
            <BookOpen className="mr-2 h-3.5 w-3.5" />
            {'EPUB으로 내보내기'}
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
    </>
  )
}

function SpellCheckButton({ editor }: { editor?: Editor | null }) {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '맞춤법 검사에 실패했습니다.')
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
    doc.descendants((node, nodePos) => {
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

function ImageInsertButton({ editor }: { editor?: Editor | null }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { aiProvider, aiImageSize, aiImageQuality, aiImageStyle } = useSettingsStore()

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    if (aiProvider === 'none') {
      setError('AI 설정에서 제공자를 선택하고 API 키를 등록하세요.')
      return
    }

    setLoading(true)
    setError('')
    setImageUrl(null)

    try {
      const result = await window.api.ai.generateImage(prompt.trim(), 'openai', {
        size: aiImageSize,
        quality: aiImageQuality,
        style: aiImageStyle,
      })
      if (result.success && result.url) {
        setImageUrl(result.url)
      } else {
        setError(result.error || '이미지 생성에 실패했습니다.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '이미지 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [prompt, aiProvider, aiImageSize, aiImageQuality, aiImageStyle])

  const handleInsert = () => {
    if (!editor || !imageUrl) return
    editor.chain().focus().setImage({ src: imageUrl }).run()
    setPanelOpen(false)
    setPrompt('')
    setImageUrl(null)
    setError('')
    toast({ description: '삽화가 삽입되었습니다.' })
  }

  const handleClose = () => {
    setPanelOpen(false)
    setPrompt('')
    setImageUrl(null)
    setError('')
  }

  return (
    <div className="relative">
      <ToolbarButton
        icon={ImageIcon}
        label="삽화 삽입"
        active={panelOpen}
        onClick={() => setPanelOpen(!panelOpen)}
      />
      {panelOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">AI 삽화 생성</h3>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Prompt input */}
          <div className="p-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="원하는 삽화를 묘사하세요...&#10;예: 어두운 숲 속 오래된 오두막, 수채화 스타일"
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
              autoFocus
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="mt-2 flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  생성 (Ctrl+Enter)
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 pb-3 text-center text-[11px] text-destructive">
              {error}
            </div>
          )}

          {/* Preview + Insert */}
          {imageUrl && (
            <div className="border-t border-border p-3">
              <img
                src={imageUrl}
                alt="Generated"
                className="w-full rounded-md border border-border"
              />
              <button
                onClick={handleInsert}
                className="mt-2 flex h-7 w-full items-center justify-center rounded-md bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                본문에 삽입
              </button>
            </div>
          )}
        </div>
      )}
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
  onReferencePanelToggle,
  referencePanelOpen,
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

        <ImageInsertButton editor={editor} />
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
        <ToolbarButton
          icon={BookMarked}
          label="자료실"
          active={referencePanelOpen}
          onClick={onReferencePanelToggle}
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
  onExit,
}: {
  visible: boolean
  formatState: FormatState
  onFormatToggle: (format: keyof FormatState) => void
  onExit?: () => void
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
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton icon={X} label="집중 모드 끝내기" onClick={onExit} />
      </div>
    </div>
  )
}
