import { create } from 'zustand'
import type { Series, Work, Chapter, Folder, Genre, WorkStatus } from '../../shared/types'
import { useAppStore } from './useAppStore'

type WorkWithChapters = Work & { chapters: Omit<Chapter, 'content'>[] }
type SeriesWithWorks = Omit<Series, 'works'> & { works: WorkWithChapters[] }

interface WorkState {
  folders: Folder[]
  series: SeriesWithWorks[]
  standaloneWorks: WorkWithChapters[]
  loading: boolean

  loadAll: () => Promise<void>
  createWork: (data: {
    title: string
    type: 'novel' | 'short'
    genre: Genre
    seriesId?: string
    goalChars?: number
    deadline?: string
    tags?: string[]
    firstChapterTitle?: string
  }) => Promise<string>
  updateWork: (id: string, data: Partial<{ title: string; genre: Genre; status: WorkStatus; seriesId: string | null; goalChars: number | null; deadline: string | null; tags: string[] }>) => Promise<void>
  deleteWork: (id: string) => Promise<void>
  duplicateWork: (id: string) => Promise<string | null>

  createChapter: (workId: string, title: string) => Promise<string>
  updateChapter: (id: string, data: { title?: string }) => Promise<void>
  deleteChapter: (id: string) => Promise<void>
  reorderChapters: (orderedIds: string[]) => Promise<void>

  updateWorkCharCount: (workId: string, charCount: number, charCountNoSpaces: number) => void

  createSeries: (data: { title: string; description?: string; folderId?: string }) => Promise<string>
  updateSeries: (id: string, data: Partial<{ title: string; description: string; folderId: string | null }>) => Promise<void>
  deleteSeries: (id: string) => Promise<void>

  createFolder: (data: { title: string }) => Promise<string>
  renameFolder: (id: string, title: string) => Promise<void>
  deleteFolder: (id: string) => Promise<{ success: boolean; error?: string }>
  moveSeriesToFolder: (seriesId: string, folderId: string) => Promise<void>
  moveWorkToFolder: (workId: string, folderId: string) => Promise<void>
}

/** Find and update a work within the tree (series + standalone) */
function updateWorkInTree(
  state: Pick<WorkState, 'series' | 'standaloneWorks'>,
  workId: string,
  updater: (work: WorkWithChapters) => WorkWithChapters
): Pick<WorkState, 'series' | 'standaloneWorks'> {
  const series = state.series.map((s) => ({
    ...s,
    works: s.works.map((w) => (w.id === workId ? updater(w) : w)),
  }))
  const standaloneWorks = state.standaloneWorks.map((w) =>
    w.id === workId ? updater(w) : w
  )
  return { series, standaloneWorks }
}

/** Remove a work from the tree */
function removeWorkFromTree(
  state: Pick<WorkState, 'series' | 'standaloneWorks'>,
  workId: string
): Pick<WorkState, 'series' | 'standaloneWorks'> {
  const series = state.series.map((s) => ({
    ...s,
    works: s.works.filter((w) => w.id !== workId),
  }))
  const standaloneWorks = state.standaloneWorks.filter((w) => w.id !== workId)
  return { series, standaloneWorks }
}

/** Resolve the "current folder" — the folder of the work open in the editor.
 * Used so a new standalone work lands under the folder the user is working in
 * (falls back to undefined → backend default folder when nothing is open). */
function currentFolderId(
  state: Pick<WorkState, 'series' | 'standaloneWorks'>,
  activeWorkId: string | undefined
): string | undefined {
  if (!activeWorkId) return undefined
  const standalone = state.standaloneWorks.find((w) => w.id === activeWorkId)
  if (standalone) return standalone.folderId ?? undefined
  const owningSeries = state.series.find((s) => s.works.some((w) => w.id === activeWorkId))
  return owningSeries?.folderId ?? undefined
}

/** Reload helper */
async function reloadAll(): Promise<Pick<WorkState, 'folders' | 'series' | 'standaloneWorks'>> {
  const all = await window.api.works.getAll()
  return { folders: all.folders, series: all.series, standaloneWorks: all.standaloneWorks }
}

export const useWorkStore = create<WorkState>((set, get) => ({
  folders: [],
  series: [],
  standaloneWorks: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    try {
      set(await reloadAll())
    } catch {
      // load failed
    } finally {
      set({ loading: false })
    }
  },

  // Full reload needed (structural change)
  createWork: async (data) => {
    // Standalone works are filed under the current folder (the open work's
    // folder); series works inherit their folder from the series.
    const folderId = data.seriesId
      ? undefined
      : currentFolderId(get(), useAppStore.getState().activeDocument?.workId)
    const result = await window.api.works.create(folderId ? { ...data, folderId } : data)
    set(await reloadAll())
    return result.id
  },

  // Optimistic update (in-place work modification)
  updateWork: async (id, data) => {
    await window.api.works.update(id, data)
    set((state) =>
      updateWorkInTree(state, id, (w) => ({ ...w, ...data }))
    )
  },

  // Optimistic update (remove from tree)
  deleteWork: async (id) => {
    await window.api.works.delete(id)
    set((state) => removeWorkFromTree(state, id))
  },

  // Full reload needed (structural change)
  duplicateWork: async (id) => {
    const result = await window.api.works.duplicate(id)
    set(await reloadAll())
    return result.id || null
  },

  // Full reload needed (structural change)
  createChapter: async (workId, title) => {
    const result = await window.api.chapters.create({ workId, title })
    set(await reloadAll())
    return result.id
  },

  // Optimistic update (in-place chapter modification)
  updateChapter: async (id, data) => {
    await window.api.chapters.update(id, data)
    const state = get()
    // Find which work contains this chapter
    const allWorks = [
      ...state.standaloneWorks,
      ...state.series.flatMap((s) => s.works),
    ]
    const parentWork = allWorks.find((w) =>
      w.chapters.some((c) => c.id === id)
    )
    if (parentWork) {
      set(
        updateWorkInTree(state, parentWork.id, (w) => ({
          ...w,
          chapters: w.chapters.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }))
      )
    }
  },

  // Optimistic update (remove chapter from parent work)
  deleteChapter: async (id) => {
    await window.api.chapters.delete(id)
    const state = get()
    const allWorks = [
      ...state.standaloneWorks,
      ...state.series.flatMap((s) => s.works),
    ]
    const parentWork = allWorks.find((w) =>
      w.chapters.some((c) => c.id === id)
    )
    if (parentWork) {
      set(
        updateWorkInTree(state, parentWork.id, (w) => ({
          ...w,
          chapters: w.chapters.filter((c) => c.id !== id),
        }))
      )
    }
  },

  // Optimistic update (reorder chapters locally)
  reorderChapters: async (orderedIds) => {
    await window.api.chapters.reorder(orderedIds)
    const state = get()
    const allWorks = [
      ...state.standaloneWorks,
      ...state.series.flatMap((s) => s.works),
    ]
    const parentWork = allWorks.find((w) =>
      w.chapters.some((c) => orderedIds.includes(c.id))
    )
    if (parentWork) {
      set(
        updateWorkInTree(state, parentWork.id, (w) => ({
          ...w,
          chapters: orderedIds
            .map((id) => w.chapters.find((c) => c.id === id))
            .filter(Boolean) as typeof w.chapters,
        }))
      )
    }
  },

  // Update char counts without full reload (called after auto-save)
  updateWorkCharCount: (workId, charCount, charCountNoSpaces) => {
    set((state) =>
      updateWorkInTree(state, workId, (w) => ({ ...w, charCount, charCountNoSpaces }))
    )
  },

  // Full reload needed (structural change)
  createSeries: async (data) => {
    const result = await window.api.series.create(data)
    set(await reloadAll())
    return result.id
  },

  // Optimistic update (in-place series modification)
  updateSeries: async (id, data) => {
    await window.api.series.update(id, data)
    set((state) => ({
      series: state.series.map((s) =>
        s.id === id ? { ...s, ...data } : s
      ),
    }))
  },

  // Full reload needed (structural change - works detached from series)
  deleteSeries: async (id) => {
    await window.api.series.delete(id)
    set(await reloadAll())
  },

  // Full reload needed (structural change)
  createFolder: async (data) => {
    const result = await window.api.folders.create(data)
    set(await reloadAll())
    return result.id
  },

  // Optimistic update (in-place folder rename)
  renameFolder: async (id, title) => {
    await window.api.folders.update(id, { title })
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, title } : f)),
    }))
  },

  // Full reload needed (structural change - contents reassigned to fallback)
  deleteFolder: async (id) => {
    const result = await window.api.folders.delete(id)
    if (result.success) set(await reloadAll())
    return { success: result.success, error: result.error }
  },

  // Optimistic update (series moves to another folder)
  moveSeriesToFolder: async (seriesId, folderId) => {
    await window.api.series.update(seriesId, { folderId })
    set((state) => ({
      series: state.series.map((s) => (s.id === seriesId ? { ...s, folderId } : s)),
    }))
  },

  // Optimistic update (standalone work moves to another folder)
  moveWorkToFolder: async (workId, folderId) => {
    await window.api.works.update(workId, { folderId })
    set((state) =>
      updateWorkInTree(state, workId, (w) => ({ ...w, folderId }))
    )
  },
}))
