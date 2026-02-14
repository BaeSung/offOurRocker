import { useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/stores/useEditorStore'

interface TipTapEditorProps {
  initialContent?: string
  focusMode?: boolean
  editorWidth?: number
  fontSize?: number
  lineHeight?: number
  fontFamily?: string
  indent?: boolean
  onReady?: (editor: ReturnType<typeof useEditor>) => void
}

export function TipTapEditor({
  initialContent = '',
  focusMode = false,
  editorWidth = 780,
  fontSize = 16,
  lineHeight = 1.9,
  fontFamily = 'Noto Serif KR',
  indent = true,
  onReady,
}: TipTapEditorProps) {
  const { markDirty, setCharCount, setCursor, setContent } = useEditorStore()

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: '이곳에 글을 쓰세요...',
      }),
      CharacterCount,
      Underline,
      Image,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      markDirty()
      const html = editor.getHTML()
      setContent(html)

      const text = editor.state.doc.textContent
      const total = text.length
      const noSpaces = text.replace(/\s/g, '').length
      setCharCount(total, noSpaces)
    },
    onSelectionUpdate: ({ editor }) => {
      const { from } = editor.state.selection
      const resolved = editor.state.doc.resolve(from)
      // Approximate line/col from position
      let line = 1
      let lastLineStart = 0
      const text = editor.state.doc.textContent
      // Walk through to find line number (approximate for rich text)
      const beforeText = editor.state.doc.textBetween(0, from, '\n', '\n')
      line = (beforeText.match(/\n/g) || []).length + 1
      const lastNewline = beforeText.lastIndexOf('\n')
      const col = lastNewline === -1 ? from + 1 : from - lastNewline
      setCursor(line, col)
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[500px]',
        spellcheck: 'false',
      },
    },
  })

  // Set initial content when it changes (e.g. switching documents)
  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const currentContent = editor.getHTML()
      // Only update if genuinely different content (not just re-render)
      if (currentContent !== initialContent) {
        editor.commands.setContent(initialContent, { emitUpdate: false })
        const text = editor.state.doc.textContent
        setCharCount(text.length, text.replace(/\s/g, '').length)
      }
    }
  }, [editor, initialContent])

  useEffect(() => {
    if (editor && onReady) {
      onReady(editor)
    }
  }, [editor, onReady])

  if (!editor) return null

  return (
    <div
      className={cn(
        'mx-auto px-8 py-8',
        focusMode ? 'max-w-[680px]' : ''
      )}
      style={{
        maxWidth: focusMode ? 680 : editorWidth,
      }}
    >
      <style>{`
        .tiptap-editor .ProseMirror {
          font-family: '${fontFamily}', serif;
          font-size: ${fontSize}px;
          line-height: ${lineHeight};
          color: hsl(35 30% 88%);
        }
        .tiptap-editor .ProseMirror p {
          margin-bottom: 0.25em;
          ${indent ? 'text-indent: 1em;' : ''}
        }
        .tiptap-editor .ProseMirror h1 {
          font-size: 1.5em;
          font-weight: 700;
          margin-bottom: 0.5em;
          text-indent: 0;
          color: hsl(35 30% 92%);
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.25em;
          font-weight: 700;
          margin-bottom: 0.4em;
          text-indent: 0;
          color: hsl(35 30% 90%);
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 1.1em;
          font-weight: 700;
          margin-bottom: 0.3em;
          text-indent: 0;
          color: hsl(35 30% 88%);
        }
        .tiptap-editor .ProseMirror blockquote {
          border-left: 2px solid hsl(30 40% 64% / 0.5);
          padding-left: 1rem;
          font-style: italic;
          color: hsl(35 30% 88% / 0.8);
          text-indent: 0;
        }
        .tiptap-editor .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5em 0;
        }
        .tiptap-editor .ProseMirror strong {
          font-weight: 700;
          color: hsl(35 30% 92%);
        }
        .tiptap-editor .ProseMirror img {
          max-width: 100%;
          border-radius: 8px;
          margin: 1em 0;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
          text-indent: 0;
        }
      `}</style>
      <div className="tiptap-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export { useEditor }
