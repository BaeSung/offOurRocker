import { create } from 'zustand'
import type { Series, Work, Chapter } from '../../shared/types'

type WorkWithChapters = Work & { chapters: Omit<Chapter, 'content'>[] }

interface WorkState {
  series: (Series & { works: WorkWithChapters[] })[]
  standaloneWorks: WorkWithChapters[]
  loading: boolean

  loadAll: () => Promise<void>
  createWork: (data: {
    title: string
    type: 'novel' | 'short'
    genre: string
    seriesId?: string
    goalChars?: number
    deadline?: string
    tags?: string[]
    firstChapterTitle?: string
  }) => Promise<string>
  updateWork: (id: string, data: Partial<{ title: string; genre: string; status: string; seriesId: string | null }>) => Promise<void>
  deleteWork: (id: string) => Promise<void>
  duplicateWork: (id: string) => Promise<string | null>

  createChapter: (workId: string, title: string) => Promise<string>
  updateChapter: (id: string, data: { title?: string }) => Promise<void>
  deleteChapter: (id: string) => Promise<void>
  reorderChapters: (orderedIds: string[]) => Promise<void>

  createSeries: (data: { title: string; description?: string }) => Promise<string>
  updateSeries: (id: string, data: Partial<{ title: string; description: string }>) => Promise<void>
  deleteSeries: (id: string) => Promise<void>
}

export const useWorkStore = create<WorkState>((set) => ({
  series: [],
  standaloneWorks: [],
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    try {
      const data = await window.api.works.getAll()
      set({ series: data.series, standaloneWorks: data.standaloneWorks })
    } catch (err) {
      console.error('[WorkStore] loadAll error:', err)
    } finally {
      set({ loading: false })
    }
  },

  createWork: async (data) => {
    const result = await window.api.works.create(data)
    // Reload all data to stay in sync
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
    return result.id
  },

  updateWork: async (id, data) => {
    await window.api.works.update(id, data)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
  },

  deleteWork: async (id) => {
    await window.api.works.delete(id)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
  },

  duplicateWork: async (id) => {
    const result = await window.api.works.duplicate(id)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
    return result.id || null
  },

  createChapter: async (workId, title) => {
    const result = await window.api.chapters.create({ workId, title })
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
    return result.id
  },

  updateChapter: async (id, data) => {
    await window.api.chapters.update(id, data)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
  },

  deleteChapter: async (id) => {
    await window.api.chapters.delete(id)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
  },

  reorderChapters: async (orderedIds) => {
    await window.api.chapters.reorder(orderedIds)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
  },

  createSeries: async (data) => {
    const result = await window.api.series.create(data)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
    return result.id
  },

  updateSeries: async (id, data) => {
    await window.api.series.update(id, data)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
  },

  deleteSeries: async (id) => {
    await window.api.series.delete(id)
    const all = await window.api.works.getAll()
    set({ series: all.series, standaloneWorks: all.standaloneWorks })
  },
}))
