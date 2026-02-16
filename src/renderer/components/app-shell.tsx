import { useEffect, useCallback } from 'react'
import { PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { matchesShortcut } from '../../shared/types'
import { useAppStore } from '@/stores/useAppStore'
import { useWorkStore } from '@/stores/useWorkStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { AppSidebar } from '@/components/app-sidebar'
import { MainEditor } from '@/components/main-editor'
import { InspectorPanel } from '@/components/inspector-panel'
import { SettingsPage } from '@/components/settings-page'
import { DashboardPage } from '@/components/dashboard-page'
import { CreateWorkModal, CreateSeriesModal } from '@/components/creation-modals'
import { SearchModal } from '@/components/search-modal'
import { TrashPage } from '@/components/trash-page'
import { PlotTimelinePage } from '@/components/plot-timeline-page'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'

export function AppShell() {
  const {
    view,
    sidebarCollapsed,
    inspectorOpen,
    workModalOpen,
    seriesModalOpen,
    searchModalOpen,
    setView,
    toggleSidebar,
    toggleInspector,
    setInspectorOpen,
    setWorkModalOpen,
    setSeriesModalOpen,
    setSearchModalOpen,
  } = useAppStore()

  // Load data on mount
  useEffect(() => {
    useWorkStore.getState().loadAll()
    useSettingsStore.getState().loadSettings()
  }, [])

  const shortcuts = useSettingsStore((s) => s.shortcuts)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b' && !(e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.closest('.ProseMirror'))) {
      e.preventDefault()
      toggleSidebar()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
      e.preventDefault()
      toggleInspector()
    }
    if (matchesShortcut(e, shortcuts.search)) {
      e.preventDefault()
      setSearchModalOpen(!searchModalOpen)
    }
    if (matchesShortcut(e, shortcuts.settings)) {
      e.preventDefault()
      setView(view === 'settings' ? 'editor' : 'settings')
    }
    if (matchesShortcut(e, shortcuts.new)) {
      e.preventDefault()
      setWorkModalOpen(true)
    }
  }, [view, searchModalOpen, shortcuts, toggleSidebar, toggleInspector, setView, setSearchModalOpen, setWorkModalOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          onSettingsOpen={() => setView('settings')}
          settingsActive={view === 'settings'}
          onDashboardOpen={() => setView('dashboard')}
          dashboardActive={view === 'dashboard'}
          onTrashOpen={() => setView('trash')}
          trashActive={view === 'trash'}
          onPlotTimelineOpen={() => setView('plotTimeline')}
          plotTimelineActive={view === 'plotTimeline'}
          onEditorOpen={() => setView('editor')}
          onNewWork={() => setWorkModalOpen(true)}
          onNewSeries={() => setSeriesModalOpen(true)}
        />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Thin top bar for inspector toggle */}
          <div className={cn('flex h-9 shrink-0 items-center justify-end border-b border-border bg-card/50 px-3', view !== 'editor' && 'invisible')}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setInspectorOpen(!inspectorOpen)}
                  className={
                    'flex h-6 w-6 items-center justify-center rounded-md transition-colors duration-150 ' +
                    (inspectorOpen
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground')
                  }
                  aria-label={inspectorOpen ? '인스펙터 닫기' : '인스펙터 열기'}
                >
                  <PanelRight className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {inspectorOpen ? '인스펙터 닫기' : '인스펙터 열기'}
                <span className="ml-2 text-muted-foreground">{'⌘\\'}</span>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex flex-1 overflow-hidden">
            {view === 'dashboard' && <DashboardPage />}
            {view === 'trash' && <TrashPage />}
            {view === 'plotTimeline' && <PlotTimelinePage />}
            {view === 'settings' && (
              <SettingsPage onClose={() => setView('editor')} />
            )}
            {view === 'editor' && (
              <>
                <MainEditor sidebarCollapsed={sidebarCollapsed} />
                <InspectorPanel
                  open={inspectorOpen}
                  onClose={() => setInspectorOpen(false)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <CreateWorkModal
        open={workModalOpen}
        onClose={() => setWorkModalOpen(false)}
        onSwitchToSeries={() => setSeriesModalOpen(true)}
      />
      <CreateSeriesModal
        open={seriesModalOpen}
        onClose={() => setSeriesModalOpen(false)}
      />
      <SearchModal />
    </TooltipProvider>
  )
}
