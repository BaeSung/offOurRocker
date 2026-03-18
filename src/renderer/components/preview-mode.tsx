import { ScrollArea } from '@/components/ui/scroll-area'
import { useEditorStore } from '@/stores/useEditorStore'
import { useAppStore } from '@/stores/useAppStore'
import { useWorkStore } from '@/stores/useWorkStore'

export function PreviewMode() {
  const content = useEditorStore((s) => s.content)
  const activeDocument = useAppStore((s) => s.activeDocument)
  const { series, standaloneWorks } = useWorkStore()

  // Find active chapter/work title
  const activeWork = (() => {
    if (!activeDocument) return null
    for (const s of series) {
      for (const w of s.works) {
        if (w.id === activeDocument.workId) return w
      }
    }
    return standaloneWorks.find((w) => w.id === activeDocument.workId) || null
  })()

  const activeChapter = (() => {
    if (!activeDocument?.chapterId || !activeWork?.chapters) return null
    return activeWork.chapters.find((c) => c.id === activeDocument.chapterId) || null
  })()

  const title = activeChapter?.title || activeWork?.title || ''

  return (
    <div className="flex flex-1 justify-center overflow-hidden bg-amber-50 dark:bg-stone-900">
      <ScrollArea className="flex-1">
        <article className="mx-auto max-w-[680px] px-12 py-16">
          {title && (
            <h1
              className="mb-8 text-center font-serif text-3xl font-bold leading-tight"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {title}
            </h1>
          )}
          <style>{`
            .preview-content {
              font-family: 'Noto Serif KR', serif;
              font-size: 17px;
              line-height: 2.0;
              color: hsl(var(--foreground));
            }
            .preview-content p {
              text-indent: 0;
              margin-bottom: 0.5em;
            }
            .preview-content h1, .preview-content h2, .preview-content h3 {
              text-indent: 0;
              color: hsl(var(--foreground));
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            .preview-content h1 { font-size: 1.5em; font-weight: 700; }
            .preview-content h2 { font-size: 1.3em; font-weight: 700; }
            .preview-content h3 { font-size: 1.1em; font-weight: 700; }
            .preview-content blockquote {
              border-left: 2px solid hsl(var(--primary));
              padding-left: 1.5rem;
              font-style: italic;
              color: hsl(var(--muted-foreground));
              text-indent: 0;
            }
            .preview-content hr {
              border: none;
              text-align: center;
              margin: 2em 0;
            }
            .preview-content hr::after {
              content: '* * *';
              letter-spacing: 0.5em;
              color: hsl(var(--muted-foreground));
              font-size: 14px;
            }
            .preview-content strong {
              font-weight: 700;
            }
            .preview-content img {
              max-width: 100%;
              border-radius: 8px;
              margin: 1em 0;
            }
          `}</style>
          <div
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: content || '<p style="color:hsl(var(--muted-foreground)); text-indent:0;">내용이 없습니다.</p>' }}
          />
        </article>
      </ScrollArea>
    </div>
  )
}
