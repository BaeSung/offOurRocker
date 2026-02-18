import {
  Plus,
  Database,
  Download,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MindMapToolbarProps {
  onAddFreeNode: () => void
  onImportData: () => void
  onExportPng: () => void
  onExportJson: () => void
  onImportJson: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

export function MindMapToolbar({
  onAddFreeNode,
  onImportData,
  onExportPng,
  onExportJson,
  onImportJson,
  onZoomIn,
  onZoomOut,
  onFitView,
}: MindMapToolbarProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card/90 px-2 py-1 shadow-md backdrop-blur-sm">
      {/* Add node */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onAddFreeNode}
            className="flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>노드</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          자유 노드 추가
        </TooltipContent>
      </Tooltip>

      {/* Import data */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onImportData}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Database className="h-3.5 w-3.5" />
            <span>데이터</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          캐릭터/세계관/플롯/챕터 불러오기
        </TooltipContent>
      </Tooltip>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Export/Import */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
            <span>내보내기</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          <DropdownMenuItem onClick={onExportPng}>
            PNG 이미지
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportJson}>
            JSON 데이터
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onImportJson}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            JSON 불러오기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Zoom */}
      <ToolbarButton icon={ZoomOut} label="축소" onClick={onZoomOut} />
      <ToolbarButton icon={ZoomIn} label="확대" onClick={onZoomIn} />
      <ToolbarButton icon={Maximize2} label="전체 보기" onClick={onFitView} />
    </div>
  )
}
