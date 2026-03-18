import epub from 'epub-gen-memory'

interface EpubChapter {
  title: string
  content: string // HTML content
}

interface EpubOptions {
  title: string
  genre: string
  createdAt: string
  coverImage?: string | null // base64 data URL
  chapters: EpubChapter[]
}

const EPUB_CSS = `
body {
  font-family: serif;
  line-height: 1.8;
  color: #1a1a1a;
  padding: 0 1em;
}
h1, h2, h3 {
  font-weight: 700;
  margin: 1.5em 0 0.5em;
}
h1 { font-size: 1.6em; }
h2 { font-size: 1.3em; }
p {
  margin: 0.5em 0;
  text-indent: 0;
}
blockquote {
  margin: 1em 2em;
  padding-left: 1em;
  border-left: 3px solid #ccc;
  color: #555;
}
hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
}
`

function htmlToXhtml(html: string): string {
  // Ensure HTML is EPUB-compatible XHTML
  let xhtml = html
    // Self-closing tags
    .replace(/<br>/gi, '<br/>')
    .replace(/<hr>/gi, '<hr/>')
    // Remove data- attributes that editors add
    .replace(/ data-[a-z-]+="[^"]*"/gi, '')
    // Remove base64 images to keep file size manageable (images not embedded in EPUB for now)
    .replace(/<img[^>]*src="data:image[^"]*"[^>]*\/?>/gi, '')
    // Ensure img tags are self-closing
    .replace(/<img([^>]*[^/])>/gi, '<img$1/>')

  return xhtml
}

export async function generateEpub(options: EpubOptions): Promise<Buffer> {
  const epubChapters = options.chapters.map((ch) => ({
    title: ch.title === '__body__' ? options.title : ch.title,
    content: htmlToXhtml(ch.content || '<p></p>'),
  }))

  // Prepare cover image buffer if available
  let cover: Buffer | undefined
  if (options.coverImage) {
    const match = options.coverImage.match(/^data:image\/[^;]+;base64,(.+)$/)
    if (match) {
      cover = Buffer.from(match[1], 'base64')
    }
  }

  const epubOptions: Parameters<typeof epub>[0] = {
    title: options.title,
    author: '',
    content: epubChapters,
    css: EPUB_CSS,
    lang: 'ko',
    description: `장르: ${options.genre}`,
    date: options.createdAt,
    ...(cover ? { cover } : {}),
  }

  const buffer = await epub(epubOptions)
  return Buffer.from(buffer)
}
