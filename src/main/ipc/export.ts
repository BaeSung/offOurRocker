import { dialog } from 'electron'
import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { eq, asc } from 'drizzle-orm'
import { IPC } from '../../shared/ipc-channels'
import { getDb } from '../db/connection'
import * as schema from '../db/schema'
import { generateEpub } from '../utils/epub-generator'
import { safeHandle } from './utils'

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/blockquote>/gi, '\n\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<(strong|b)>(.*?)<\/(strong|b)>/gi, '**$2**')
    .replace(/<(em|i)>(.*?)<\/(em|i)>/gi, '*$2*')
    .replace(/<(s|strike|del)>(.*?)<\/(s|strike|del)>/gi, '~~$2~~')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
      return content.replace(/<p[^>]*>(.*?)<\/p>/gi, '> $1\n').trim() + '\n\n'
    })
    .replace(/<hr\s*\/?>/gi, '\n---\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return md
}

export function registerExportHandlers(): void {
  const db = getDb()

  safeHandle(
    IPC.EXPORT_WORK,
    async (
      _e,
      workId: string,
      format: 'markdown' | 'txt' | 'epub',
      options?: { frontmatter?: boolean; directory?: string }
    ) => {
      const work = db
        .select()
        .from(schema.works)
        .where(eq(schema.works.id, workId))
        .get()

      if (!work) return { success: false, error: 'Work not found' }

      const chapters = db
        .select()
        .from(schema.chapters)
        .where(eq(schema.chapters.workId, workId))
        .orderBy(asc(schema.chapters.sortOrder))
        .all()

      if (format === 'epub') {
        const safeTitle = work.title.replace(/[<>:"/\\|?*]/g, '_')
        let filePath: string | undefined

        if (options?.directory) {
          filePath = join(options.directory, safeTitle + '.epub')
        } else {
          const result = await dialog.showSaveDialog({
            defaultPath: safeTitle + '.epub',
            filters: [{ name: 'EPUB', extensions: ['epub'] }],
          })
          if (result.canceled || !result.filePath) {
            return { success: false, error: 'Cancelled' }
          }
          filePath = result.filePath
        }

        const epubBuffer = await generateEpub({
          title: work.title,
          genre: work.genre,
          createdAt: work.createdAt,
          coverImage: work.coverImage,
          chapters: chapters.map((ch) => ({
            title: ch.title,
            content: ch.content || '',
          })),
        })

        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, epubBuffer)

        return { success: true, path: filePath }
      }

      let output = ''

      if (format === 'markdown') {
        if (options?.frontmatter !== false) {
          output += '---\n'
          output += `title: "${work.title}"\n`
          output += `genre: ${work.genre}\n`
          output += `status: ${work.status}\n`
          output += `type: ${work.type}\n`
          output += `created: ${work.createdAt}\n`
          output += '---\n\n'
        }

        output += `# ${work.title}\n\n`

        for (const ch of chapters) {
          if (ch.title !== '__body__') {
            output += `## ${ch.title}\n\n`
          }
          output += htmlToMarkdown(ch.content || '') + '\n\n'
        }
      } else {
        output += `${work.title}\n${'='.repeat(work.title.length)}\n\n`

        for (const ch of chapters) {
          if (ch.title !== '__body__') {
            output += `${ch.title}\n${'-'.repeat(ch.title.length)}\n\n`
          }
          output += htmlToPlainText(ch.content || '') + '\n\n'
        }
      }

      let filePath: string | undefined
      if (options?.directory) {
        const ext = format === 'markdown' ? '.md' : '.txt'
        const safeTitle = work.title.replace(/[<>:"/\\|?*]/g, '_')
        filePath = join(options.directory, safeTitle + ext)
      } else {
        const ext = format === 'markdown' ? 'md' : 'txt'
        const filterName = format === 'markdown' ? 'Markdown' : 'Text'
        const safeTitle = work.title.replace(/[<>:"/\\|?*]/g, '_')
        const result = await dialog.showSaveDialog({
          defaultPath: safeTitle + '.' + ext,
          filters: [{ name: filterName, extensions: [ext] }],
        })
        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Cancelled' }
        }
        filePath = result.filePath
      }

      await mkdir(dirname(filePath), { recursive: true })
      await writeFile(filePath, output, 'utf-8')

      return { success: true, path: filePath }
    }
  )
}
