import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
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
  indent = false,
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
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            'data-size': { default: 'full', renderHTML: (a) => ({ 'data-size': a['data-size'] }), parseHTML: (el) => el.getAttribute('data-size') || 'full' },
            'data-align': { default: 'center', renderHTML: (a) => ({ 'data-align': a['data-align'] }), parseHTML: (el) => el.getAttribute('data-align') || 'center' },
          }
        },
      }).configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'tiptap-image',
        },
      }),
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
      // Only update editor if genuinely different content (not just re-render)
      if (currentContent !== initialContent) {
        editor.commands.setContent(initialContent, { emitUpdate: false })
      }
      // Always sync char count and content to store (covers initial load)
      const text = editor.state.doc.textContent
      setCharCount(text.length, text.replace(/\s/g, '').length)
      setContent(editor.getHTML())
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
          color: hsl(var(--foreground));
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
          color: hsl(var(--foreground));
        }
        .tiptap-editor .ProseMirror h2 {
          font-size: 1.25em;
          font-weight: 700;
          margin-bottom: 0.4em;
          text-indent: 0;
          color: hsl(var(--foreground));
        }
        .tiptap-editor .ProseMirror h3 {
          font-size: 1.1em;
          font-weight: 700;
          margin-bottom: 0.3em;
          text-indent: 0;
          color: hsl(var(--foreground));
        }
        .tiptap-editor .ProseMirror blockquote {
          border-left: 2px solid hsl(var(--accent) / 0.5);
          padding-left: 1rem;
          font-style: italic;
          color: hsl(var(--muted-foreground));
          text-indent: 0;
        }
        .tiptap-editor .ProseMirror hr {
          border: none;
          border-top: 1px solid hsl(var(--border));
          margin: 1.5em 0;
        }
        .tiptap-editor .ProseMirror strong {
          font-weight: 700;
          color: hsl(var(--foreground));
        }
        .tiptap-editor .ProseMirror img.tiptap-image {
          max-width: 100%;
          border-radius: 8px;
          margin: 1em 0;
          cursor: pointer;
          transition: outline 0.15s;
        }
        .tiptap-editor .ProseMirror img.ProseMirror-selectednode {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }
        .tiptap-editor .ProseMirror img[data-size="small"] { width: 33%; }
        .tiptap-editor .ProseMirror img[data-size="medium"] { width: 60%; }
        .tiptap-editor .ProseMirror img[data-size="full"] { width: 100%; }
        .tiptap-editor .ProseMirror img[data-align="left"] { margin-left: 0; margin-right: auto; display: block; }
        .tiptap-editor .ProseMirror img[data-align="center"] { margin-left: auto; margin-right: auto; display: block; }
        .tiptap-editor .ProseMirror img[data-align="right"] { margin-left: auto; margin-right: 0; display: block; }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
          text-indent: 0;
        }
      `}</style>
      <div className="tiptap-editor relative">
        <EditorContent editor={editor} />
        <ImageBubbleMenu editor={editor} />
      </div>
    </div>
  )
}

function ImageBubbleMenu({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  // Track editor selection reactively
  const { isImage, currentSize, currentAlign } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const active = e.isActive('image')
      if (!active) return { isImage: false, currentSize: 'full', currentAlign: 'center' }
      const { from } = e.state.selection
      const node = e.state.doc.nodeAt(from)
      return {
        isImage: true,
        currentSize: node?.attrs?.['data-size'] || 'full',
        currentAlign: node?.attrs?.['data-align'] || 'center',
      }
    },
  })

  // Position the menu above the selected image
  useEffect(() => {
    if (!isImage) {
      setPos(null)
      return
    }
    const { from } = editor.state.selection
    const domNode = editor.view.nodeDOM(from)
    if (!(domNode instanceof HTMLElement)) {
      setPos(null)
      return
    }
    const imgEl = domNode.tagName === 'IMG' ? domNode : domNode.querySelector('img')
    if (!imgEl) { setPos(null); return }

    const editorRect = editor.view.dom.closest('.tiptap-editor')?.getBoundingClientRect()
    const imgRect = imgEl.getBoundingClientRect()
    if (!editorRect) { setPos(null); return }

    const menuWidth = menuRef.current?.offsetWidth || 240
    setPos({
      top: imgRect.top - editorRect.top - 40,
      left: imgRect.left - editorRect.left + imgRect.width / 2 - menuWidth / 2,
    })
  }, [isImage, editor, currentSize, currentAlign])

  const setImageAttr = (attr: string, value: string) => {
    const { from } = editor.state.selection
    const node = editor.state.doc.nodeAt(from)
    if (!node) return
    const tr = editor.state.tr
    tr.setNodeMarkup(from, undefined, { ...node.attrs, [attr]: value })
    editor.view.dispatch(tr)
  }

  const deleteImage = () => {
    editor.chain().focus().deleteSelection().run()
  }

  if (!isImage || !pos) return null

  return (
    <div
      ref={menuRef}
      className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-border bg-card/95 px-1.5 py-1 shadow-lg backdrop-blur-sm"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Size */}
      {(['small', 'medium', 'full'] as const).map((size) => (
        <button
          key={size}
          onClick={() => setImageAttr('data-size', size)}
          className={cn(
            'h-6 rounded px-2 text-[10px] font-medium transition-colors',
            currentSize === size
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {size === 'small' ? '소' : size === 'medium' ? '중' : '대'}
        </button>
      ))}

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Align */}
      {([
        { value: 'left', icon: AlignLeft },
        { value: 'center', icon: AlignCenter },
        { value: 'right', icon: AlignRight },
      ] as const).map(({ value, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setImageAttr('data-align', value)}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded transition-colors',
            currentAlign === value
              ? 'bg-secondary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Icon className="h-3 w-3" />
        </button>
      ))}

      <div className="mx-1 h-4 w-px bg-border" />

      {/* Delete */}
      <button
        onClick={deleteImage}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        title="삭제"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  )
}

export { useEditor }
