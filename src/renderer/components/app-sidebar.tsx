import {
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  FolderPlus,
  Settings,
  Trash2,
  LayoutDashboard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RockingChairLogo } from "@/components/rocking-chair-logo"
import { SearchBar } from "@/components/search-bar"
import { TreeView } from "@/components/tree-view"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AppSidebarProps {
  collapsed: boolean
  onToggle: () => void
  onSettingsOpen?: () => void
  settingsActive?: boolean
  onDashboardOpen?: () => void
  dashboardActive?: boolean
  onTrashOpen?: () => void
  trashActive?: boolean
  onEditorOpen?: () => void
  onNewWork?: () => void
  onNewSeries?: () => void
}

function SidebarButton({
  icon: Icon,
  label,
  collapsed,
  variant = "ghost",
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  collapsed: boolean
  variant?: "primary" | "secondary" | "ghost"
  onClick?: () => void
}) {
  const baseClasses =
    "flex items-center gap-1.5 rounded-md text-[11px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

  const variantClasses = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-100",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost:
      "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              baseClasses,
              variantClasses[variant],
              "h-8 w-8 justify-center"
            )}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        baseClasses,
        variantClasses[variant],
        "h-7 w-full justify-start px-2"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

export function AppSidebar({ collapsed, onToggle, onSettingsOpen, settingsActive, onDashboardOpen, dashboardActive, onTrashOpen, trashActive, onEditorOpen, onNewWork, onNewSeries }: AppSidebarProps) {
  return (
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-card transition-[width] duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[280px]"
        )}
        role="complementary"
        aria-label="사이드바"
      >
        {/* Header */}
        <div
          className={cn(
            "flex h-9 shrink-0 items-center border-b border-border px-3",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <button
            onClick={onDashboardOpen}
            className="flex items-center gap-2 rounded-md transition-colors hover:opacity-80"
            aria-label="대시보드로 이동"
          >
            <RockingChairLogo className="h-6 w-6 shrink-0 text-primary" />
            {!collapsed && (
              <span className="font-serif text-sm font-bold tracking-tight text-foreground">
                Off Our Rocker
              </span>
            )}
          </button>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              aria-label="사이드바 접기"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Collapsed toggle at top */}
        {collapsed && (
          <div className="flex justify-center py-2">
            <button
              onClick={onToggle}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
              aria-label="사이드바 펼치기"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className={cn("px-3 py-2", collapsed && "flex justify-center")}>
          <SearchBar collapsed={collapsed} />
        </div>

        {/* Tree View */}
        <TreeView collapsed={collapsed} onItemSelect={onEditorOpen} />

        {/* Bottom actions */}
        <div className="mt-auto border-t border-border">
          <div
            className={cn(
              "flex flex-col gap-1 p-2",
              collapsed && "items-center"
            )}
          >
            <SidebarButton
              icon={Plus}
              label="새 작품"
              collapsed={collapsed}
              variant="primary"
              onClick={onNewWork}
            />
            <SidebarButton
              icon={FolderPlus}
              label="새 시리즈"
              collapsed={collapsed}
              variant="secondary"
              onClick={onNewSeries}
            />
          </div>
          <Separator className="bg-border" />
          <div
            className={cn(
              "flex gap-1 p-2",
              collapsed ? "flex-col items-center" : "flex-row"
            )}
          >
            <SidebarButton
              icon={LayoutDashboard}
              label="대시보드"
              collapsed={collapsed}
              variant={dashboardActive ? "secondary" : "ghost"}
              onClick={onDashboardOpen}
            />
            <SidebarButton
              icon={Settings}
              label="설정"
              collapsed={collapsed}
              variant={settingsActive ? "secondary" : "ghost"}
              onClick={onSettingsOpen}
            />
            <SidebarButton
              icon={Trash2}
              label="휴지통"
              collapsed={collapsed}
              variant={trashActive ? "secondary" : "ghost"}
              onClick={onTrashOpen}
            />
          </div>
        </div>
      </aside>
  )
}
