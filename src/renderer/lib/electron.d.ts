import type { Work, Chapter, Series, AppSettings, WritingLog, Goal } from '../../shared/types'

interface WorksAPI {
  getAll(): Promise<{
    series: (Series & { works: (Work & { chapters: Omit<Chapter, 'content'>[] })[] })[]
    standaloneWorks: (Work & { chapters: Omit<Chapter, 'content'>[] })[]
  }>
  getById(id: string): Promise<(Work & { chapters: Omit<Chapter, 'content'>[] }) | null>
  create(data: {
    title: string
    type: 'novel' | 'short'
    genre: string
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
      genre: string
      status: string
      seriesId: string | null
      goalChars: number
      deadline: string
      tags: string[]
    }>
  ): Promise<{ success: boolean }>
  delete(id: string): Promise<{ success: boolean }>
  getContent(workId: string): Promise<string>
  saveContent(workId: string, content: string): Promise<{ success: boolean }>
  duplicate(id: string): Promise<{ success: boolean; id: string }>
}

interface ChaptersAPI {
  getById(id: string): Promise<Chapter | null>
  create(data: { workId: string; title: string }): Promise<{ id: string }>
  save(id: string, content: string): Promise<{ success: boolean }>
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
  set(key: string, value: any): Promise<{ success: boolean }>
}

interface StatsAPI {
  summary(): Promise<{
    totalWorks: number
    writingWorks: number
    totalChars: number
    weeklyData: number[]
  }>
  recentWorks(): Promise<(Work & { charCount: number })[]>
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

interface SearchResult {
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
    format: 'markdown' | 'txt',
    options?: { frontmatter?: boolean; directory?: string }
  ): Promise<{ success: boolean; path?: string; error?: string }>
}

interface BackupAPI {
  now(customDir?: string): Promise<{ success: boolean; path?: string; error?: string }>
}

interface Version {
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

interface TrashItem {
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

interface SpellCorrection {
  original: string
  corrected: string
  explanation: string
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
  generateImage(
    prompt: string,
    keyName: string,
    options?: { size?: string; quality?: string; style?: string }
  ): Promise<{ success: boolean; url?: string; error?: string }>
}

interface SystemAPI {
  selectDirectory(): Promise<string | null>
  getAppVersion(): Promise<string>
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
  trash: TrashAPI
  ai: AIAPI
  system: SystemAPI
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
