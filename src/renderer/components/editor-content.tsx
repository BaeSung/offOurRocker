import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { CheckCheck } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TipTapEditor } from '@/components/editor/tiptap-editor'
import type { HighlightTerm } from '@/components/editor/reference-highlight'
import { SpellCheckPanel } from '@/components/spell-check-panel'
import { useEditorStore } from '@/stores/useEditorStore'
import { useAppStore } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'
import type { Character, WorldNote } from '../../shared/types'

interface EditorContentProps {
  focusMode: boolean
  editorRef?: React.MutableRefObject<Editor | null>
}

export function EditorContent({ focusMode, editorRef }: EditorContentProps) {
  const [loadedContent, setLoadedContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const activeDocument = useAppStore((s) => s.activeDocument)
  const { reset } = useEditorStore()

  // Context menu spell check state
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const [ctxSpellOpen, setCtxSpellOpen] = useState(false)
  const [ctxSpellLoading, setCtxSpellLoading] = useState(false)
  const [ctxCorrections, setCtxCorrections] = useState<{ original: string; corrected: string; explanation: string }[]>([])
  const [ctxSpellError, setCtxSpellError] = useState('')
  const [ctxProgress, setCtxProgress] = useState<{ current: number; total: number } | null>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)

  const { aiProvider, aiModel } = useSettingsStore()

  // Close context menu on click outside
  useEffect(() => {
    if (!ctxMenu) return
    const handler = (e: MouseEvent) => {
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
        setCtxMenu(null)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [ctxMenu])

  // Listen for spell check progress
  useEffect(() => {
    const cleanup = window.api.ai.onSpellCheckProgress((p) => {
      setCtxProgress(p)
    })
    return cleanup
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const editor = editorRef?.current
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return // no selection, use default menu
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY })
    setCtxSpellOpen(false)
  }, [editorRef])

  const handleCtxSpellCheck = useCallback(async () => {
    const editor = editorRef?.current
    if (!editor) return
    const { from, to } = editor.state.selection
    if (from === to) return

    const selectedText = editor.state.doc.textBetween(from, to, '\n')
    if (!selectedText || selectedText.trim().length < 2) return

    if (aiProvider === 'none') {
      setCtxSpellError('AI 설정에서 제공자를 선택하고 API 키를 등록하세요.')
      setCtxSpellOpen(true)
      setCtxMenu(null)
      return
    }

    const model = aiModel || (aiProvider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-5-20250929')

    setCtxMenu(null)
    setCtxSpellOpen(true)
    setCtxSpellLoading(true)
    setCtxSpellError('')
    setCtxCorrections([])
    setCtxProgress(null)

    try {
      const result = await window.api.ai.spellCheck(selectedText, aiProvider, model, aiProvider)
      if (result.success && result.corrections) {
        setCtxCorrections(result.corrections)
      } else {
        setCtxSpellError(result.error || '맞춤법 검사에 실패했습니다.')
      }
    } catch (err: unknown) {
      setCtxSpellError(err instanceof Error ? err.message : '맞춤법 검사에 실패했습니다.')
    } finally {
      setCtxSpellLoading(false)
      setCtxProgress(null)
    }
  }, [editorRef, aiProvider, aiModel])

  const handleCtxApply = useCallback((original: string, corrected: string) => {
    const editor = editorRef?.current
    if (!editor) return
    const { doc } = editor.state
    let pos = 0
    let found = false
    doc.descendants((node, nodePos) => {
      if (found) return false
      if (node.isText) {
        const idx = (node.text || '').indexOf(original)
        if (idx !== -1) {
          pos = nodePos + idx
          found = true
          return false
        }
      }
    })
    if (found) {
      editor.chain().focus().insertContentAt({ from: pos, to: pos + original.length }, corrected).run()
    }
  }, [editorRef])

  const handleCtxApplyAll = useCallback(() => {
    for (const c of ctxCorrections) {
      handleCtxApply(c.original, c.corrected)
    }
  }, [ctxCorrections, handleCtxApply])

  // Settings
  const fontFamily = useSettingsStore((s) => s.fontFamily)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const editorWidth = useSettingsStore((s) => s.editorWidth)
  const indent = useSettingsStore((s) => s.indent)
  const referenceHighlight = useSettingsStore((s) => s.referenceHighlight)

  // Load world notes + characters for the active work to feed the highlight plugin
  const [characters, setCharacters] = useState<Character[]>([])
  const [worldNotes, setWorldNotes] = useState<WorldNote[]>([])

  useEffect(() => {
    const workId = activeDocument?.workId
    if (!workId || !referenceHighlight) {
      setCharacters([])
      setWorldNotes([])
      return
    }
    let cancelled = false
    Promise.all([
      window.api.characters.getByWork(workId),
      window.api.worldNotes.getByWork(workId),
    ])
      .then(([chars, notes]) => {
        if (cancelled) return
        setCharacters(chars)
        setWorldNotes(notes)
      })
      .catch(() => {
        if (!cancelled) {
          setCharacters([])
          setWorldNotes([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeDocument?.workId, referenceHighlight])

  const highlightTerms = useMemo<HighlightTerm[]>(() => {
    if (!referenceHighlight) return []
    const terms: HighlightTerm[] = []
    for (const c of characters) {
      const name = c.name?.trim()
      if (!name) continue
      terms.push({
        id: `char-${c.id}`,
        text: name,
        kind: 'character',
        preview: [c.role, c.description].filter(Boolean).join(' · '),
      })
    }
    for (const w of worldNotes) {
      const title = w.title?.trim()
      if (!title) continue
      terms.push({
        id: `world-${w.id}`,
        text: title,
        kind: 'world',
        preview: [w.category, w.content].filter(Boolean).join(' · '),
      })
    }
    return terms
  }, [referenceHighlight, characters, worldNotes])

  // Load content when active document changes
  useEffect(() => {
    if (!activeDocument) {
      setLoadedContent('')
      reset()
      return
    }

    let cancelled = false
    setLoading(true)

    const load = async () => {
      try {
        let content: string
        if (activeDocument.chapterId) {
          const chapter = await window.api.chapters.getById(activeDocument.chapterId)
          content = chapter?.content || ''
        } else {
          content = await window.api.works.getContent(activeDocument.workId)
        }
        if (!cancelled) {
          setLoadedContent(content)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [activeDocument?.workId, activeDocument?.chapterId])

  const handleEditorReady = useCallback(
    (editor: Editor) => {
      if (editorRef) editorRef.current = editor
    },
    [editorRef]
  )

  if (!activeDocument) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            사이드바에서 작품이나 챕터를 선택하세요
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-sm text-muted-foreground animate-pulse">
          불러오는 중...
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div onContextMenu={handleContextMenu}>
        <TipTapEditor
          initialContent={loadedContent}
          focusMode={focusMode}
          editorWidth={editorWidth}
          fontSize={fontSize}
          lineHeight={lineHeight}
          fontFamily={fontFamily}
          indent={indent}
          highlightEnabled={referenceHighlight}
          highlightTerms={highlightTerms}
          onReady={handleEditorReady}
        />
      </div>

      {/* Right-click context menu */}
      {ctxMenu && (
        <div
          ref={ctxMenuRef}
          className="fixed z-[100] min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-xl"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            onClick={handleCtxSpellCheck}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary/50"
          >
            <CheckCheck className="h-3.5 w-3.5 text-primary" />
            선택 영역 맞춤법 검사
          </button>
        </div>
      )}

      {/* Floating spell check panel from context menu */}
      {ctxSpellOpen && (
        <div className="fixed right-8 top-20 z-[100]">
          <SpellCheckPanel
            open={ctxSpellOpen}
            onClose={() => setCtxSpellOpen(false)}
            loading={ctxSpellLoading}
            corrections={ctxCorrections}
            error={ctxSpellError}
            onApply={handleCtxApply}
            onApplyAll={handleCtxApplyAll}
            progress={ctxProgress}
          />
        </div>
      )}
    </ScrollArea>
  )
}
