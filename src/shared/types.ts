/* ── Shared types used across main, preload, and renderer ── */

export type WorkStatus = 'writing' | 'editing' | 'complete'
export type WorkType = 'novel' | 'short'
export type Genre = 'horror' | 'sf' | 'literary' | 'fantasy' | 'other'

export interface Series {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  works: Work[]
}

export interface Work {
  id: string
  seriesId: string | null
  title: string
  type: WorkType
  genre: Genre
  status: WorkStatus
  goalChars: number | null
  deadline: string | null
  tags: string[]
  coverImage: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  chapters?: Chapter[]
  charCount?: number // computed from chapters or content
}

export interface Chapter {
  id: string
  workId: string
  title: string
  content: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  charCount?: number // computed from content
}

export interface WritingLog {
  id: string
  date: string // YYYY-MM-DD
  workId: string | null
  charCount: number
}

export interface Goal {
  id: string
  title: string
  description: string | null
  targetType: 'daily' | 'total' | 'deadline'
  targetValue: number
  currentValue: number
  deadline: string | null
  createdAt: string
}

export type CharacterRole = '주인공' | '조연' | '악역' | '기타'
export type WorldNoteCategory = '장소' | '세력' | '설정' | '역사' | '기타'

export interface Character {
  id: string
  workId: string
  name: string
  role: CharacterRole
  description: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface WorldNote {
  id: string
  workId: string
  category: WorldNoteCategory
  title: string
  content: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  // General
  theme: 'dark' | 'light' | 'system'
  accentColor: string
  language: string
  saveDirectory: string
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly'
  backupDirectory: string
  openLastWork: boolean
  showStartScreen: boolean

  // Editor
  fontFamily: string
  titleFontFamily: string
  fontSize: number
  lineHeight: number
  editorWidth: number
  indent: boolean
  indentSize: string
  autoSaveInterval: number // seconds
  showCharCount: boolean
  spellCheck: boolean
  spellUnderline: boolean
  lineHighlight: boolean
  autoQuotes: boolean
  autoEllipsis: boolean
  charCountMode: 'include' | 'exclude'
  manuscriptBase: number
  focusDarkness: number
  typingSound: boolean
  soundType: string

  // Export
  defaultExportFormat: 'markdown' | 'txt' | 'html'
  exportFrontmatter: boolean
  exportIncludeImages: boolean
  exportFootnoteStyle: 'inline' | 'bottom'
  exportDirectory: string

  // AI
  aiProvider: 'openai' | 'anthropic' | 'none'
  aiModel: string
  aiImageShareKey: boolean
  aiImageSize: string
  aiImageQuality: string
  aiImageStyle: string

  // Shortcuts
  shortcuts: Record<string, string>
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'amber',
  language: 'ko',
  saveDirectory: '',
  autoBackup: true,
  backupFrequency: 'daily',
  backupDirectory: '',
  openLastWork: true,
  showStartScreen: true,

  fontFamily: 'Noto Serif KR',
  titleFontFamily: 'Noto Serif KR',
  fontSize: 16,
  lineHeight: 1.8,
  editorWidth: 680,
  indent: false,
  indentSize: '1em',
  autoSaveInterval: 30,
  showCharCount: true,
  spellCheck: false,
  spellUnderline: true,
  lineHighlight: true,
  autoQuotes: false,
  autoEllipsis: true,
  charCountMode: 'include',
  manuscriptBase: 200,
  focusDarkness: 80,
  typingSound: false,
  soundType: 'typewriter',

  defaultExportFormat: 'markdown',
  exportFrontmatter: true,
  exportIncludeImages: true,
  exportFootnoteStyle: 'bottom',
  exportDirectory: '',

  aiProvider: 'none',
  aiModel: '',
  aiImageShareKey: true,
  aiImageSize: '1024x1024',
  aiImageQuality: 'standard',
  aiImageStyle: 'natural',

  shortcuts: {
    save: 'Ctrl+S',
    search: 'Ctrl+K',
    focus: 'Ctrl+Shift+F',
    preview: 'Ctrl+Shift+P',
    settings: 'Ctrl+,',
    bold: 'Ctrl+B',
    italic: 'Ctrl+I',
    strike: 'Ctrl+Shift+X',
    spell: 'Ctrl+Shift+L',
    new: 'Ctrl+N',
  },
}

/** Check if a KeyboardEvent matches a shortcut string like "Ctrl+Shift+F" */
export function matchesShortcut(e: KeyboardEvent, combo: string): boolean {
  const parts = combo.split('+')
  const key = parts[parts.length - 1]
  const needCtrl = parts.includes('Ctrl')
  const needShift = parts.includes('Shift')
  const needAlt = parts.includes('Alt')

  if (needCtrl !== (e.ctrlKey || e.metaKey)) return false
  if (needShift !== e.shiftKey) return false
  if (needAlt !== e.altKey) return false

  const eventKey = e.key.length === 1 ? e.key.toUpperCase() : e.key
  const targetKey = key.length === 1 ? key.toUpperCase() : key

  return eventKey === targetKey
}

/* ── Config maps (shared between main & renderer) ── */

export const STATUS_CONFIG: Record<WorkStatus, { label: string; color: string }> = {
  writing: { label: '집필중', color: 'bg-blue-500' },
  editing: { label: '퇴고중', color: 'bg-amber-500' },
  complete: { label: '완료', color: 'bg-emerald-500' },
}

export const GENRE_CONFIG: Record<Genre, { label: string; color: string }> = {
  horror: { label: '공포', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  sf: { label: 'SF', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  literary: { label: '순문학', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  fantasy: { label: '판타지', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  other: { label: '기타', color: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20' },
}
