import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import { DOMSerializer } from '@tiptap/pm/model'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'
import { Trash2, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEditorStore } from '@/stores/useEditorStore'
import {
  ReferenceHighlight,
  referenceHighlightKey,
  type HighlightTerm,
} from './reference-highlight'

interface TipTapEditorProps {
  initialContent?: string
  focusMode?: boolean
  editorWidth?: number
  fontSize?: number
  lineHeight?: number
  fontFamily?: string
  indent?: boolean
  highlightEnabled?: boolean
  highlightTerms?: HighlightTerm[]
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
  highlightEnabled = false,
  highlightTerms = [],
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
      ReferenceHighlight.configure({
        enabled: highlightEnabled,
        terms: highlightTerms,
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
      handleDOMEvents: {
        copy: (view, event) => {
          const { from, to } = view.state.selection
          if (from === to) return false
          const slice = view.state.doc.slice(from, to)
          const serializer = DOMSerializer.fromSchema(view.state.schema)
          const div = document.createElement('div')
          div.appendChild(serializer.serializeFragment(slice.content))
          const ce = event as ClipboardEvent
          ce.clipboardData?.setData('text/html', div.innerHTML)
          ce.clipboardData?.setData('text/plain', view.state.doc.textBetween(from, to, '\n\n'))
          ce.preventDefault()
          return true
        },
        cut: (view, event) => {
          const { from, to } = view.state.selection
          if (from === to) return false
          const slice = view.state.doc.slice(from, to)
          const serializer = DOMSerializer.fromSchema(view.state.schema)
          const div = document.createElement('div')
          div.appendChild(serializer.serializeFragment(slice.content))
          const ce = event as ClipboardEvent
          ce.clipboardData?.setData('text/html', div.innerHTML)
          ce.clipboardData?.setData('text/plain', view.state.doc.textBetween(from, to, '\n\n'))
          ce.preventDefault()
          view.dispatch(view.state.tr.deleteSelection())
          return true
        },
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

  // Push highlight config changes into the plugin without reinitializing the editor
  useEffect(() => {
    if (!editor) return
    const tr = editor.state.tr.setMeta(referenceHighlightKey, {
      enabled: highlightEnabled,
      terms: highlightTerms,
    })
    editor.view.dispatch(tr)
  }, [editor, highlightEnabled, highlightTerms])

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
        .tiptap-editor .ProseMirror .reference-highlight {
          border-radius: 2px;
          padding: 0 1px;
          cursor: help;
          transition: background-color 0.15s;
        }
        .tiptap-editor .ProseMirror .reference-highlight-world {
          background-color: rgba(59, 130, 246, 0.18);
          box-shadow: inset 0 -2px 0 rgba(59, 130, 246, 0.55);
        }
        .tiptap-editor .ProseMirror .reference-highlight-world:hover {
          background-color: rgba(59, 130, 246, 0.32);
        }
        .tiptap-editor .ProseMirror .reference-highlight-character {
          background-color: rgba(168, 85, 247, 0.18);
          box-shadow: inset 0 -2px 0 rgba(168, 85, 247, 0.55);
        }
        .tiptap-editor .ProseMirror .reference-highlight-character:hover {
          background-color: rgba(168, 85, 247, 0.32);
        }
      `}</style>
      <div className="tiptap-editor relative">
        <EditorContent editor={editor} />
        <ImageBubbleMenu editor={editor} />
        <ReferenceHoverTooltip enabled={highlightEnabled} />
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

function ReferenceHoverTooltip({ enabled }: { enabled: boolean }) {
  const [state, setState] = useState<{
    top: number
    left: number
    kind: string
    text: string
    preview: string
  } | null>(null)

  useEffect(() => {
    if (!enabled) {
      setState(null)
      return
    }

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const el = target.closest?.('.reference-highlight') as HTMLElement | null
      if (!el) return
      const rect = el.getBoundingClientRect()
      setState({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        kind: el.getAttribute('data-ref-kind') || '',
        text: el.textContent || '',
        preview: el.getAttribute('data-ref-preview') || '',
      })
    }
    const onOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const el = target.closest?.('.reference-highlight')
      if (!el) return
      const related = e.relatedTarget as HTMLElement | null
      if (related && related.closest?.('.reference-highlight') === el) return
      setState(null)
    }

    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout', onOut)
    return () => {
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout', onOut)
    }
  }, [enabled])

  if (!state) return null

  const kindLabel = state.kind === 'character' ? '인물' : '세계관'
  const kindClass =
    state.kind === 'character'
      ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
      : 'border-blue-500/40 bg-blue-500/10 text-blue-300'

  return (
    <div
      className="pointer-events-none fixed z-[200] max-w-[320px] rounded-md border border-border bg-popover p-2 shadow-lg"
      style={{ top: state.top, left: state.left }}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium', kindClass)}>
          {kindLabel}
        </span>
        <span className="text-xs font-medium text-foreground">{state.text}</span>
      </div>
      {state.preview && (
        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
          {state.preview.length > 200 ? state.preview.slice(0, 200) + '…' : state.preview}
        </p>
      )}
    </div>
  )
}

export { useEditor }
