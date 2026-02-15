/* ── IPC channel name constants ── */

export const IPC = {
  // Works
  WORKS_GET_ALL: 'works:getAll',
  WORKS_GET_BY_ID: 'works:getById',
  WORKS_CREATE: 'works:create',
  WORKS_UPDATE: 'works:update',
  WORKS_DELETE: 'works:delete',
  WORKS_GET_CONTENT: 'works:getContent',
  WORKS_SAVE_CONTENT: 'works:saveContent',
  WORKS_DUPLICATE: 'works:duplicate',

  // Chapters
  CHAPTERS_GET_BY_ID: 'chapters:getById',
  CHAPTERS_CREATE: 'chapters:create',
  CHAPTERS_SAVE: 'chapters:save',
  CHAPTERS_DELETE: 'chapters:delete',
  CHAPTERS_REORDER: 'chapters:reorder',
  CHAPTERS_UPDATE: 'chapters:update',

  // Series
  SERIES_GET_ALL: 'series:getAll',
  SERIES_CREATE: 'series:create',
  SERIES_UPDATE: 'series:update',
  SERIES_DELETE: 'series:delete',

  // Settings
  SETTINGS_GET_ALL: 'settings:getAll',
  SETTINGS_SET: 'settings:set',

  // Stats
  STATS_SUMMARY: 'stats:summary',
  STATS_RECENT_WORKS: 'stats:recentWorks',
  STATS_GENRE_DISTRIBUTION: 'stats:genreDistribution',

  // Writing Log
  WRITING_LOG_GET_BY_MONTH: 'writingLog:getByMonth',

  // Goals
  GOALS_GET_ALL: 'goals:getAll',
  GOALS_CREATE: 'goals:create',
  GOALS_UPDATE: 'goals:update',
  GOALS_DELETE: 'goals:delete',

  // Search
  SEARCH_QUERY: 'search:query',

  // Export
  EXPORT_WORK: 'export:work',

  // Backup
  BACKUP_NOW: 'backup:now',

  // Versions
  VERSIONS_LIST: 'versions:list',
  VERSIONS_CREATE: 'versions:create',
  VERSIONS_RESTORE: 'versions:restore',
  VERSIONS_DELETE: 'versions:delete',

  // Trash
  TRASH_LIST: 'trash:list',
  TRASH_RESTORE: 'trash:restore',
  TRASH_PERMANENT_DELETE: 'trash:permanentDelete',
  TRASH_EMPTY: 'trash:empty',

  // AI
  AI_STORE_KEY: 'ai:storeKey',
  AI_GET_KEY: 'ai:getKey',
  AI_DELETE_KEY: 'ai:deleteKey',
  AI_TEST_CONNECTION: 'ai:testConnection',
  AI_SPELL_CHECK: 'ai:spellCheck',
  AI_GENERATE_IMAGE: 'ai:generateImage',

  // Characters
  CHARACTERS_GET_BY_WORK: 'characters:getByWork',
  CHARACTERS_CREATE: 'characters:create',
  CHARACTERS_UPDATE: 'characters:update',
  CHARACTERS_DELETE: 'characters:delete',
  CHARACTERS_REORDER: 'characters:reorder',

  // World Notes
  WORLD_NOTES_GET_BY_WORK: 'worldNotes:getByWork',
  WORLD_NOTES_CREATE: 'worldNotes:create',
  WORLD_NOTES_UPDATE: 'worldNotes:update',
  WORLD_NOTES_DELETE: 'worldNotes:delete',
  WORLD_NOTES_REORDER: 'worldNotes:reorder',

  // System
  SYSTEM_SELECT_DIRECTORY: 'system:selectDirectory',
  SYSTEM_GET_APP_VERSION: 'system:getAppVersion',
} as const
