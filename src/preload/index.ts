import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc-channels'

const api = {
  works: {
    getAll: () => ipcRenderer.invoke(IPC.WORKS_GET_ALL),
    getById: (id: string) => ipcRenderer.invoke(IPC.WORKS_GET_BY_ID, id),
    create: (data: any) => ipcRenderer.invoke(IPC.WORKS_CREATE, data),
    update: (id: string, data: any) => ipcRenderer.invoke(IPC.WORKS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC.WORKS_DELETE, id),
    getContent: (workId: string) => ipcRenderer.invoke(IPC.WORKS_GET_CONTENT, workId),
    saveContent: (workId: string, content: string) =>
      ipcRenderer.invoke(IPC.WORKS_SAVE_CONTENT, workId, content),
    duplicate: (id: string) => ipcRenderer.invoke(IPC.WORKS_DUPLICATE, id),
  },
  chapters: {
    getById: (id: string) => ipcRenderer.invoke(IPC.CHAPTERS_GET_BY_ID, id),
    create: (data: { workId: string; title: string }) =>
      ipcRenderer.invoke(IPC.CHAPTERS_CREATE, data),
    save: (id: string, content: string) => ipcRenderer.invoke(IPC.CHAPTERS_SAVE, id, content),
    delete: (id: string) => ipcRenderer.invoke(IPC.CHAPTERS_DELETE, id),
    reorder: (orderedIds: string[]) => ipcRenderer.invoke(IPC.CHAPTERS_REORDER, orderedIds),
    update: (id: string, data: { title?: string }) =>
      ipcRenderer.invoke(IPC.CHAPTERS_UPDATE, id, data),
  },
  series: {
    getAll: () => ipcRenderer.invoke(IPC.SERIES_GET_ALL),
    create: (data: { title: string; description?: string }) =>
      ipcRenderer.invoke(IPC.SERIES_CREATE, data),
    update: (id: string, data: any) => ipcRenderer.invoke(IPC.SERIES_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC.SERIES_DELETE, id),
  },
  settings: {
    getAll: () => ipcRenderer.invoke(IPC.SETTINGS_GET_ALL),
    set: (key: string, value: any) => ipcRenderer.invoke(IPC.SETTINGS_SET, key, value),
  },
  stats: {
    summary: () => ipcRenderer.invoke(IPC.STATS_SUMMARY),
    recentWorks: () => ipcRenderer.invoke(IPC.STATS_RECENT_WORKS),
    genreDistribution: () => ipcRenderer.invoke(IPC.STATS_GENRE_DISTRIBUTION),
  },
  writingLog: {
    getByMonth: (year: number, month: number) =>
      ipcRenderer.invoke(IPC.WRITING_LOG_GET_BY_MONTH, year, month),
  },
  goals: {
    getAll: () => ipcRenderer.invoke(IPC.GOALS_GET_ALL),
    create: (data: any) => ipcRenderer.invoke(IPC.GOALS_CREATE, data),
    update: (id: string, data: any) => ipcRenderer.invoke(IPC.GOALS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC.GOALS_DELETE, id),
  },
  search: {
    query: (q: string) => ipcRenderer.invoke(IPC.SEARCH_QUERY, q),
  },
  export: {
    work: (workId: string, format: string, options?: any) =>
      ipcRenderer.invoke(IPC.EXPORT_WORK, workId, format, options),
  },
  backup: {
    now: (customDir?: string) => ipcRenderer.invoke(IPC.BACKUP_NOW, customDir),
  },
  versions: {
    list: (chapterId: string) => ipcRenderer.invoke(IPC.VERSIONS_LIST, chapterId),
    create: (chapterId: string, label?: string) =>
      ipcRenderer.invoke(IPC.VERSIONS_CREATE, chapterId, label),
    restore: (versionId: string) => ipcRenderer.invoke(IPC.VERSIONS_RESTORE, versionId),
    delete: (versionId: string) => ipcRenderer.invoke(IPC.VERSIONS_DELETE, versionId),
  },
  trash: {
    list: () => ipcRenderer.invoke(IPC.TRASH_LIST),
    restore: (workId: string) => ipcRenderer.invoke(IPC.TRASH_RESTORE, workId),
    permanentDelete: (workId: string) => ipcRenderer.invoke(IPC.TRASH_PERMANENT_DELETE, workId),
    empty: () => ipcRenderer.invoke(IPC.TRASH_EMPTY),
  },
  ai: {
    storeKey: (keyName: string, plainKey: string) =>
      ipcRenderer.invoke(IPC.AI_STORE_KEY, keyName, plainKey),
    getKey: (keyName: string) => ipcRenderer.invoke(IPC.AI_GET_KEY, keyName),
    deleteKey: (keyName: string) => ipcRenderer.invoke(IPC.AI_DELETE_KEY, keyName),
    testConnection: (provider: 'openai' | 'anthropic', keyName: string) =>
      ipcRenderer.invoke(IPC.AI_TEST_CONNECTION, provider, keyName),
    spellCheck: (text: string, provider: 'openai' | 'anthropic', model: string, keyName: string) =>
      ipcRenderer.invoke(IPC.AI_SPELL_CHECK, text, provider, model, keyName),
    generateImage: (prompt: string, keyName: string, options?: any) =>
      ipcRenderer.invoke(IPC.AI_GENERATE_IMAGE, prompt, keyName, options),
  },
  system: {
    selectDirectory: () => ipcRenderer.invoke(IPC.SYSTEM_SELECT_DIRECTORY),
    getAppVersion: () => ipcRenderer.invoke(IPC.SYSTEM_GET_APP_VERSION),
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.api = api
}
