import { useRef } from 'react'
import {
  Bold,
  Italic,
  Strikethrough,
  Heading,
  Quote,
  Minus,
  Superscript,
  ImageIcon,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG } from '../../../shared/types'
import type { WorkStatus } from '../../../shared/types'
import type { Editor } from '@tiptap/react'
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
import { ToolbarButton } from './toolbar-button'
import { InlineEdit } from './inline-edit'
import { SpellCheckButton } from './spell-check-button'
import { ImageInsertButton } from './image-insert-button'

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
          <DropdownMenuItem onClick={() => window.api.system.print()}>
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
    <div className="flex h-11 shrink-0 items-center border-b border-border/50 px-4 print-hide">
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
