import { create } from 'zustand'

interface EditorState {
  content: string       // HTML content from TipTap
  isDirty: boolean
  charCount: number
  charCountNoSpaces: number
  cursorLine: number
  cursorCol: number
  lastSavedAt: string | null

  setContent: (content: string) => void
  markDirty: () => void
  markClean: () => void
  setCharCount: (total: number, noSpaces: number) => void
  setCursor: (line: number, col: number) => void
  setLastSavedAt: (time: string) => void
  reset: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
  content: '',
  isDirty: false,
  charCount: 0,
  charCountNoSpaces: 0,
  cursorLine: 1,
  cursorCol: 1,
  lastSavedAt: null,

  setContent: (content) => set({ content }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),
  setCharCount: (total, noSpaces) => set({ charCount: total, charCountNoSpaces: noSpaces }),
  setCursor: (line, col) => set({ cursorLine: line, cursorCol: col }),
  setLastSavedAt: (time) => set({ lastSavedAt: time }),
  reset: () =>
    set({
      content: '',
      isDirty: false,
      charCount: 0,
      charCountNoSpaces: 0,
      cursorLine: 1,
      cursorCol: 1,
      lastSavedAt: null,
    }),
}))
