import type { Work, Chapter, Series, AppSettings, WritingLog, Goal, Character, CharacterRole, WorldNote, WorldNoteCategory, PlotEvent, Genre, WorkStatus } from '../../shared/types'

interface WorksAPI {
  getAll(): Promise<{
    series: (Series & { works: (Work & { chapters: Omit<Chapter, 'content'>[] })[] })[]
    standaloneWorks: (Work & { chapters: Omit<Chapter, 'content'>[] })[]
  }>
  getById(id: string): Promise<(Work & { chapters: Omit<Chapter, 'content'>[] }) | null>
  create(data: {
    title: string
    type: 'novel' | 'short'
    genre: Genre
    seriesId?: string
    goalChars?: number
    deadline?: string
    tags?: string[]
    firstChapterTitle?: string
  }): Promise<{ id: string }>
  update(
    id: string,
    data: Partial<{
      title: string
      genre: Genre
      status: WorkStatus
      seriesId: string | null
      goalChars: number | null
      deadline: string | null
      tags: string[]
      coverImage: string | null
    }>
  ): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
  getContent(workId: string): Promise<string>
  saveContent(workId: string, content: string, charCount?: number, charCountNoSpaces?: number): Promise<{ success: boolean }>
  duplicate(id: string): Promise<{ success: boolean; id: string }>
}

interface ChaptersAPI {
  getById(id: string): Promise<Chapter | null>
  create(data: { workId: string; title: string }): Promise<{ id: string }>
  save(id: string, content: string, charCount?: number, charCountNoSpaces?: number): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
  reorder(orderedIds: string[]): Promise<{ success: boolean }>
  update(id: string, data: { title?: string }): Promise<{ success: boolean }>
}

interface SeriesAPI {
  getAll(): Promise<Series[]>
  create(data: { title: string; description?: string }): Promise<{ id: string }>
  update(id: string, data: Partial<{ title: string; description: string }>): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
}

interface SettingsAPI {
  getAll(): Promise<AppSettings>
  set(key: string, value: unknown): Promise<{ success: boolean }>
}

interface StatsAPI {
  summary(): Promise<{
    totalWorks: number
    writingWorks: number
    totalChars: number
    weeklyData: number[]
  }>
  recentWorks(): Promise<(Work & { charCount: number; charCountNoSpaces: number })[]>
  allWorks(): Promise<(Work & { charCount: number; charCountNoSpaces: number })[]>
  genreDistribution(): Promise<{ genre: string; count: number }[]>
}

interface WritingLogAPI {
  getByMonth(year: number, month: number): Promise<{ date: string; total: number }[]>
}

interface GoalsAPI {
  getAll(): Promise<Goal[]>
  create(data: {
    title: string
    description?: string
    targetType: 'daily' | 'total' | 'deadline'
    targetValue: number
    deadline?: string
  }): Promise<{ id: string }>
  update(id: string, data: Partial<{ title: string; currentValue: number; targetValue: number }>): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
}

export interface SearchResult {
  type: 'work' | 'chapter'
  workId: string
  workTitle: string
  chapterId: string | null
  chapterTitle: string | null
  snippet: string
}

interface SearchAPI {
  query(q: string): Promise<SearchResult[]>
}

interface ExportAPI {
  work(
    workId: string,
    format: 'markdown' | 'txt' | 'epub',
    options?: { frontmatter?: boolean; directory?: string }
  ): Promise<{ success: boolean; path?: string; error?: string }>
}

interface BackupAPI {
  now(customDir?: string): Promise<{ success: boolean; path?: string; error?: string }>
}

export interface Version {
  id: string
  chapterId: string
  content: string
  charCount: number
  label: string | null
  createdAt: string
}

interface VersionsAPI {
  list(chapterId: string): Promise<Version[]>
  create(chapterId: string, label?: string): Promise<{ success: boolean; id?: string; error?: string }>
  restore(versionId: string): Promise<{ success: boolean; chapterId?: string; error?: string }>
  delete(versionId: string): Promise<{ success: boolean }>
}

export interface Revision {
  id: string
  workId: string
  roundNumber: number
  label: string | null
  note: string | null
  totalCharCount: number
  createdAt: string
}

export interface RevisionDiffChapter {
  chapterId: string | null
  chapterTitle: string
  sortOrder: number
  fromContent: string | null
  toContent: string | null
  fromCharCount: number
  toCharCount: number
  changed: boolean
}

export interface RevisionDiffResult {
  success: boolean
  from: { id: string; roundNumber: number; label: string | null; createdAt: string } | null
  to: { id: string; roundNumber: number; label: string | null; createdAt: string } | null
  chapters: RevisionDiffChapter[]
}

interface RevisionsAPI {
  list(workId: string): Promise<Revision[]>
  create(
    workId: string,
    options?: { label?: string; note?: string }
  ): Promise<{ success: boolean; id?: string; roundNumber?: number; error?: string }>
  update(
    revisionId: string,
    data: { label?: string | null; note?: string | null }
  ): Promise<{ success: boolean }>
  delete(revisionId: string): Promise<{ success: boolean }>
  diff(workId: string, fromId: string | null, toId: string | null): Promise<RevisionDiffResult>
}

export interface TrashItem {
  id: string
  title: string
  type: string
  genre: string
  deletedAt: string | null
  charCount: number
}

interface TrashAPI {
  list(): Promise<TrashItem[]>
  restore(workId: string): Promise<{ success: boolean }>
  permanentDelete(workId: string): Promise<{ success: boolean }>
  empty(): Promise<{ success: boolean; count?: number }>
}

export type { SpellCorrection } from '../../shared/types'
import type { SpellCorrection } from '../../shared/types'

export interface SpellCheckProgress {
  current: number
  total: number
}

interface AIAPI {
  storeKey(keyName: string, plainKey: string): Promise<{ success: boolean; error?: string }>
  getKey(keyName: string): Promise<{ exists: boolean; masked: string; error?: string }>
  deleteKey(keyName: string): Promise<{ success: boolean; error?: string }>
  testConnection(
    provider: 'openai' | 'anthropic',
    keyName: string
  ): Promise<{ success: boolean; error?: string }>
  spellCheck(
    text: string,
    provider: 'openai' | 'anthropic',
    model: string,
    keyName: string
  ): Promise<{ success: boolean; corrections?: SpellCorrection[]; error?: string }>
  onSpellCheckProgress(callback: (progress: SpellCheckProgress) => void): () => void
  generateImage(
    prompt: string,
    keyName: string,
    options?: { size?: string; quality?: string; style?: string }
  ): Promise<{ success: boolean; url?: string; b64?: string; error?: string }>
}

interface AnalyticsAPI {
  weeklyTrend(): Promise<{ week: string; chars: number }[]>
  monthlyTrend(): Promise<{ month: string; chars: number }[]>
  streak(): Promise<{ current: number; longest: number }>
  workDistribution(): Promise<{ title: string; chars: number }[]>
}

interface PlotEventsAPI {
  getByWork(workId: string): Promise<PlotEvent[]>
  create(data: {
    workId: string
    title: string
    description?: string
    color?: string
    chapterId?: string
  }): Promise<{ id: string }>
  update(
    id: string,
    data: Partial<{ title: string; description: string; color: string; chapterId: string | null }>
  ): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
  reorder(orderedIds: string[]): Promise<{ success: boolean }>
}

interface MindMapAPI {
  get(workId: string): Promise<{ nodes: unknown[]; edges: unknown[]; viewport: { x: number; y: number; zoom: number } }>
  save(workId: string, data: string): Promise<{ success: boolean }>
  exportPng(base64: string): Promise<{ success: boolean; path?: string; error?: string }>
  exportJson(json: string): Promise<{ success: boolean; path?: string; error?: string }>
  importJson(): Promise<{ success: boolean; data?: { nodes: unknown[]; edges: unknown[] }; error?: string }>
}

interface GitCommitEntry {
  hash: string
  message: string
  date: string
}

interface GitAPI {
  check(): Promise<{ installed: boolean; version: string }>
  init(path?: string): Promise<{ success: boolean; error?: string }>
  commit(path?: string): Promise<{ success: boolean; message?: string; error?: string }>
  status(path?: string): Promise<{ initialized: boolean; lastCommit: { message: string; date: string } | null }>
  setRemote(url: string, path?: string): Promise<{ success: boolean; error?: string }>
  push(path?: string): Promise<{ success: boolean; error?: string }>
  pull(path?: string): Promise<{ success: boolean; conflict?: boolean; summary?: unknown; error?: string }>
  forcePull(path?: string): Promise<{ success: boolean; error?: string }>
  forcePush(path?: string): Promise<{ success: boolean; error?: string }>
  log(maxCount?: number, path?: string): Promise<{ commits: GitCommitEntry[] }>
  restore(commitHash: string, path?: string): Promise<{ success: boolean; needsReload?: boolean; error?: string }>
  resolveConflict(strategy: 'ours' | 'theirs', path?: string): Promise<{ success: boolean; needsReload?: boolean; error?: string }>
}

interface DatabaseAPI {
  export(): Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>
  import(): Promise<{ success: boolean; needsReload?: boolean; canceled?: boolean; error?: string }>
}

interface SystemAPI {
  selectDirectory(): Promise<string | null>
  getAppVersion(): Promise<string>
  getDefaultPaths(): Promise<{ backup: string; save: string; export: string }>
  print(): Promise<{ success: boolean; error?: string }>
  openExternal(url: string): Promise<{ success: boolean; error?: string }>
}

interface CharactersAPI {
  getByWork(workId: string): Promise<Character[]>
  create(data: {
    workId: string
    name: string
    role: CharacterRole
    description?: string
  }): Promise<{ id: string }>
  update(
    id: string,
    data: Partial<{ name: string; role: CharacterRole; description: string }>
  ): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
  reorder(orderedIds: string[]): Promise<{ success: boolean }>
}

interface WorldNotesAPI {
  getByWork(workId: string): Promise<WorldNote[]>
  create(data: {
    workId: string
    category: WorldNoteCategory
    title: string
    content?: string
  }): Promise<{ id: string }>
  update(
    id: string,
    data: Partial<{ category: WorldNoteCategory; title: string; content: string }>
  ): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
  reorder(orderedIds: string[]): Promise<{ success: boolean }>
}

interface ElectronAPI {
  works: WorksAPI
  chapters: ChaptersAPI
  series: SeriesAPI
  settings: SettingsAPI
  stats: StatsAPI
  writingLog: WritingLogAPI
  goals: GoalsAPI
  search: SearchAPI
  export: ExportAPI
  backup: BackupAPI
  versions: VersionsAPI
  revisions: RevisionsAPI
  trash: TrashAPI
  ai: AIAPI
  analytics: AnalyticsAPI
  plotEvents: PlotEventsAPI
  characters: CharactersAPI
  worldNotes: WorldNotesAPI
  mindMap: MindMapAPI
  git: GitAPI
  database: DatabaseAPI
  system: SystemAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
