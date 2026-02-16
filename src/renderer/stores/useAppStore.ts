import { create } from 'zustand'

export type AppView = 'dashboard' | 'editor' | 'settings' | 'trash' | 'plotTimeline'

interface ActiveDocument {
  workId: string
  chapterId: string | null // null for short stories
}

interface AppState {
  view: AppView
  sidebarCollapsed: boolean
  inspectorOpen: boolean
  activeDocument: ActiveDocument | null
  workModalOpen: boolean
  seriesModalOpen: boolean
  searchModalOpen: boolean

  setView: (view: AppView) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleInspector: () => void
  setInspectorOpen: (open: boolean) => void
  setActiveDocument: (workId: string, chapterId?: string | null) => void
  clearActiveDocument: () => void
  setWorkModalOpen: (open: boolean) => void
  setSeriesModalOpen: (open: boolean) => void
  setSearchModalOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  sidebarCollapsed: false,
  inspectorOpen: false,
  activeDocument: null,
  workModalOpen: false,
  seriesModalOpen: false,
  searchModalOpen: false,

  setView: (view) => set({ view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setActiveDocument: (workId, chapterId = null) =>
    set({ activeDocument: { workId, chapterId }, view: 'editor' }),
  clearActiveDocument: () => set({ activeDocument: null }),
  setWorkModalOpen: (open) => set({ workModalOpen: open }),
  setSeriesModalOpen: (open) => set({ seriesModalOpen: open }),
  setSearchModalOpen: (open) => set({ searchModalOpen: open }),
}))
