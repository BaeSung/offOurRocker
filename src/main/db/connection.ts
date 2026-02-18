import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let db: ReturnType<typeof drizzle<typeof schema>>
let sqlite: Database.Database

const DB_NAME = 'off-our-rocker.db'

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
    CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      series_id TEXT REFERENCES series(id) ON DELETE SET NULL,
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
