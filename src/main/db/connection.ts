import { app } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let db: ReturnType<typeof drizzle<typeof schema>>
let sqlite: Database.Database

export const DB_NAME = 'off-our-rocker.db'

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, DB_NAME)

  sqlite = new Database(dbPath)

  // Enable WAL mode for better concurrent read/write performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })

  // Create tables if they don't exist
  createTables()

  // Run migrations for existing databases
  runMigrations()

}

function createTables(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      series_id TEXT REFERENCES series(id) ON DELETE SET NULL,
      folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      genre TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'writing',
      goal_chars INTEGER,
      deadline TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS versions (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      char_count INTEGER NOT NULL DEFAULT 0,
      label TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS writing_log (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      work_id TEXT REFERENCES works(id) ON DELETE SET NULL,
      char_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      target_type TEXT NOT NULL,
      target_value INTEGER NOT NULL,
      current_value INTEGER NOT NULL DEFAULT 0,
      deadline TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS world_notes (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plot_events (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mind_maps (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      data TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revisions (
      id TEXT PRIMARY KEY,
      work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      round_number INTEGER NOT NULL,
      label TEXT,
      note TEXT,
      total_char_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revision_chapters (
      id TEXT PRIMARY KEY,
      revision_id TEXT NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
      chapter_id TEXT,
      chapter_title TEXT NOT NULL,
      chapter_sort_order INTEGER NOT NULL DEFAULT 0,
      content TEXT NOT NULL,
      char_count INTEGER NOT NULL DEFAULT 0
    );
  `)
}

function runMigrations(): void {
  // Add deleted_at column to works if it doesn't exist
  const worksColumns = sqlite.pragma('table_info(works)') as { name: string }[]
  if (!worksColumns.some((c) => c.name === 'deleted_at')) {
    sqlite.exec('ALTER TABLE works ADD COLUMN deleted_at TEXT')
  }
  if (!worksColumns.some((c) => c.name === 'cover_image')) {
    sqlite.exec('ALTER TABLE works ADD COLUMN cover_image TEXT')
  }

  // Add char count columns to chapters
  const chapCols = sqlite.pragma('table_info(chapters)') as { name: string }[]
  if (!chapCols.some((c) => c.name === 'char_count')) {
    sqlite.exec('ALTER TABLE chapters ADD COLUMN char_count INTEGER NOT NULL DEFAULT 0')
    sqlite.exec('ALTER TABLE chapters ADD COLUMN char_count_no_spaces INTEGER NOT NULL DEFAULT 0')

    // Backfill: strip HTML tags, compute both counts
    const rows = sqlite.prepare('SELECT id, content FROM chapters').all() as { id: string; content: string }[]
    const update = sqlite.prepare('UPDATE chapters SET char_count = ?, char_count_no_spaces = ? WHERE id = ?')
    const backfill = sqlite.transaction(() => {
      for (const row of rows) {
        const text = (row.content || '').replace(/<[^>]*>/g, '')
        update.run(text.length, text.replace(/\s/g, '').length, row.id)
      }
    })
    backfill()
  }

  // Add folder_id columns (최상위 디렉터리 도입) to series and works
  const seriesCols = sqlite.pragma('table_info(series)') as { name: string }[]
  if (!seriesCols.some((c) => c.name === 'folder_id')) {
    sqlite.exec('ALTER TABLE series ADD COLUMN folder_id TEXT')
  }
  const worksColsForFolder = sqlite.pragma('table_info(works)') as { name: string }[]
  if (!worksColsForFolder.some((c) => c.name === 'folder_id')) {
    sqlite.exec('ALTER TABLE works ADD COLUMN folder_id TEXT')
  }

  // First-time folder backfill: if no folders exist yet but there is existing
  // content, create a default folder and move all existing series + standalone
  // works into it so nothing appears unfiled after the upgrade.
  const folderCount = (sqlite.prepare('SELECT COUNT(*) AS c FROM folders').get() as { c: number }).c
  if (folderCount === 0) {
    const seriesCount = (sqlite.prepare('SELECT COUNT(*) AS c FROM series').get() as { c: number }).c
    const standaloneCount = (
      sqlite.prepare('SELECT COUNT(*) AS c FROM works WHERE series_id IS NULL').get() as { c: number }
    ).c
    if (seriesCount > 0 || standaloneCount > 0) {
      const ts = new Date().toISOString()
      const defaultId = randomUUID()
      const backfill = sqlite.transaction(() => {
        sqlite
          .prepare('INSERT INTO folders (id, title, sort_order, created_at, updated_at) VALUES (?, ?, 0, ?, ?)')
          .run(defaultId, '기본 폴더', ts, ts)
        sqlite.prepare('UPDATE series SET folder_id = ? WHERE folder_id IS NULL').run(defaultId)
        sqlite
          .prepare('UPDATE works SET folder_id = ? WHERE series_id IS NULL AND folder_id IS NULL')
          .run(defaultId)
      })
      backfill()
    }
  }

  // Indexes on FK columns and frequently queried columns
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_series_folder_id ON series(folder_id);
    CREATE INDEX IF NOT EXISTS idx_works_folder_id ON works(folder_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_work_id ON chapters(work_id);
    CREATE INDEX IF NOT EXISTS idx_characters_work_id ON characters(work_id);
    CREATE INDEX IF NOT EXISTS idx_world_notes_work_id ON world_notes(work_id);
    CREATE INDEX IF NOT EXISTS idx_plot_events_work_id ON plot_events(work_id);
    CREATE INDEX IF NOT EXISTS idx_plot_events_chapter_id ON plot_events(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_versions_chapter_id ON versions(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_writing_log_date ON writing_log(date);
    CREATE INDEX IF NOT EXISTS idx_writing_log_work_id ON writing_log(work_id);
    CREATE INDEX IF NOT EXISTS idx_works_deleted ON works(deleted);
    CREATE INDEX IF NOT EXISTS idx_works_series_id ON works(series_id);
    CREATE INDEX IF NOT EXISTS idx_mind_maps_work_id ON mind_maps(work_id);
    CREATE INDEX IF NOT EXISTS idx_revisions_work_id ON revisions(work_id);
    CREATE INDEX IF NOT EXISTS idx_revision_chapters_revision_id ON revision_chapters(revision_id);
  `)
}

export function getDb() {
  return db
}

export function getSqlite(): Database.Database {
  return sqlite
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
  }
}
