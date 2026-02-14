import { create } from 'zustand'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { AppSettings } from '../../shared/types'

interface SettingsState extends AppSettings {
  loaded: boolean
  loadSettings: () => Promise<void>
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    try {
      const settings = await window.api.settings.getAll()
      set({ ...settings, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  setSetting: async (key, value) => {
    set({ [key]: value } as any)
    try {
      await window.api.settings.set(key, value)
    } catch {
      // save failed
    }
  },
}))
