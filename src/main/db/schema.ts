import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const series = sqliteTable('series', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const works = sqliteTable('works', {
  id: text('id').primaryKey(),
  seriesId: text('series_id').references(() => series.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  type: text('type').notNull().$type<'novel' | 'short'>(),
  genre: text('genre').notNull().$type<'horror' | 'sf' | 'literary' | 'fantasy' | 'other'>(),
  status: text('status').notNull().$type<'writing' | 'editing' | 'complete'>().default('writing'),
  goalChars: integer('goal_chars'),
  deadline: text('deadline'),
  tags: text('tags').notNull().default('[]'), // JSON array
  sortOrder: integer('sort_order').notNull().default(0),
  deleted: integer('deleted').notNull().default(0), // soft delete
  deletedAt: text('deleted_at'), // timestamp of soft-delete
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const chapters = sqliteTable('chapters', {
  id: text('id').primaryKey(),
  workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

export const writingLog = sqliteTable('writing_log', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  workId: text('work_id').references(() => works.id, { onDelete: 'set null' }),
  charCount: integer('char_count').notNull().default(0)
})

export const versions = sqliteTable('versions', {
  id: text('id').primaryKey(),
  chapterId: text('chapter_id').notNull().references(() => chapters.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  charCount: integer('char_count').notNull().default(0),
  label: text('label'), // optional user label, e.g. "퇴고 전"
  createdAt: text('created_at').notNull()
})

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  targetType: text('target_type').notNull().$type<'daily' | 'total' | 'deadline'>(),
  targetValue: integer('target_value').notNull(),
  currentValue: integer('current_value').notNull().default(0),
  deadline: text('deadline'),
  createdAt: text('created_at').notNull()
})
