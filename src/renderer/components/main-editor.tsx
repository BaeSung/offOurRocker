import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { matchesShortcut } from '../../shared/types'
import { useAppStore } from '@/stores/useAppStore'
import { useEditorStore } from '@/stores/useEditorStore'
import { useWorkStore } from '@/stores/useWorkStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from '@/hooks/use-toast'
import { useAutoSave } from '@/hooks/useAutoSave'
import { EditorToolbar, MiniToolbar } from '@/components/editor-toolbar'
import { EditorContent } from '@/components/editor-content'
import { EditorStatusBar, FocusStatusBar } from '@/components/editor-status-bar'
import { PreviewMode } from '@/components/preview-mode'
import { VersionHistoryPanel } from '@/components/version-history-panel'
import { ReferencePanel } from '@/components/reference-panel'

import type { WorkStatus } from '../../shared/types'

export type EditorMode = 'normal' | 'focus' | 'preview'

interface MainEditorProps {
  sidebarCollapsed?: boolean
}

export function MainEditor({ sidebarCollapsed }: MainEditorProps) {
  const [mode, setMode] = useState<EditorMode>('normal')
  const [miniToolbarVisible, setMiniToolbarVisible] = useState(false)
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(false)
  const [referencePanelOpen, setReferencePanelOpen] = useState(false)
  const editorRef = useRef<any>(null)

  const activeDocument = useAppStore((s) => s.activeDocument)
  const { charCountNoSpaces, cursorLine, cursorCol } = useEditorStore()

  // Find the active work/chapter info
  const { series, standaloneWorks } = useWorkStore()
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

  const workTitle = activeWork?.title || '제목 없음'
  const chapterTitle = activeChapter?.title || ''
  const status = (activeWork?.status as WorkStatus) || 'writing'

  // Auto-save hook
  useAutoSave()

  // Keyboard shortcuts (read from persisted settings)
  const shortcuts = useSettingsStore((s) => s.shortcuts)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (matchesShortcut(e, shortcuts.focus)) {
        e.preventDefault()
        setMode((prev) => (prev === 'focus' ? 'normal' : 'focus'))
      }
      if (matchesShortcut(e, shortcuts.preview)) {
        e.preventDefault()
        setMode((prev) => (prev === 'preview' ? 'normal' : 'preview'))
      }
      if (e.key === 'Escape' && mode === 'focus') {
        setMode('normal')
      }
      if (matchesShortcut(e, shortcuts.save)) {
        e.preventDefault()
        manualSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mode, activeDocument, shortcuts])

  const manualSave = async () => {
    const { isDirty, content, markClean } = useEditorStore.getState()
    const doc = useAppStore.getState().activeDocument
    if (!isDirty || !doc) return
    try {
      if (doc.chapterId) {
        await window.api.chapters.save(doc.chapterId, content)
      } else {
        await window.api.works.saveContent(doc.workId, content)
      }
      markClean()
      toast({ description: '저장되었습니다.' })
    } catch (err) {
      toast({ description: '저장에 실패했습니다.', variant: 'destructive' })
    }
  }

  // Focus mode: mini toolbar on mouse near top
  useEffect(() => {
    if (mode !== 'focus') {
      setMiniToolbarVisible(false)
      return
    }
    const handler = (e: MouseEvent) => {
      setMiniToolbarVisible(e.clientY < 60)
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [mode])

  const handleModeChange = useCallback((newMode: EditorMode) => {
    setMode(newMode)
  }, [])

  const handleWorkTitleChange = useCallback(
    async (title: string) => {
      if (!activeDocument) return
      await useWorkStore.getState().updateWork(activeDocument.workId, { title })
    },
    [activeDocument]
  )

  const handleChapterTitleChange = useCallback(
    async (title: string) => {
      if (!activeDocument?.chapterId) return
      await useWorkStore.getState().updateChapter(activeDocument.chapterId, { title })
    },
    [activeDocument]
  )

  const handleStatusChange = useCallback(
    async (newStatus: WorkStatus) => {
      if (!activeDocument) return
      await useWorkStore.getState().updateWork(activeDocument.workId, { status: newStatus })
    },
    [activeDocument]
  )

  // Get TipTap editor for toolbar commands
  const getEditor = () => editorRef.current

  // Format state from TipTap
  const editor = getEditor()
  const formatState = {
    bold: editor?.isActive('bold') ?? false,
    italic: editor?.isActive('italic') ?? false,
    strikethrough: editor?.isActive('strike') ?? false,
  }

  const handleFormatToggle = useCallback(
    (format: 'bold' | 'italic' | 'strikethrough') => {
      const ed = editorRef.current
      if (!ed) return
      switch (format) {
        case 'bold':
          ed.chain().focus().toggleBold().run()
          break
        case 'italic':
          ed.chain().focus().toggleItalic().run()
          break
        case 'strikethrough':
          ed.chain().focus().toggleStrike().run()
          break
      }
    },
    []
  )

  const handleVersionHistoryToggle = useCallback(() => {
    setReferencePanelOpen(false)
    setVersionHistoryOpen((prev) => !prev)
  }, [])

  const handleReferencePanelToggle = useCallback(() => {
    setVersionHistoryOpen(false)
    setReferencePanelOpen((prev) => !prev)
  }, [])

  const handleContentRestored = useCallback(async () => {
    // Reload the chapter content into the editor after a version restore
    const doc = useAppStore.getState().activeDocument
    if (!doc) return
    try {
      let content: string
      if (doc.chapterId) {
        const ch = await window.api.chapters.getById(doc.chapterId)
        content = ch?.content || ''
      } else {
        content = await window.api.works.getContent(doc.workId)
      }
      const ed = editorRef.current
      if (ed) {
        ed.commands.setContent(content, { emitUpdate: false })
      }
      useEditorStore.getState().setContent(content)
    } catch {
      // version restore reload failed silently
    }
  }, [])

  // Preview mode
  if (mode === 'preview') {
    return (
      <main className="flex flex-1 flex-col overflow-hidden">
        <EditorToolbar
          mode={mode}
          onModeChange={handleModeChange}
          workId={activeDocument?.workId}
          workTitle={workTitle}
          chapterTitle={chapterTitle}
          status={status}
          onStatusChange={handleStatusChange}
          onWorkTitleChange={handleWorkTitleChange}
          onChapterTitleChange={handleChapterTitleChange}
          formatState={formatState}
          onFormatToggle={handleFormatToggle}
          editor={getEditor()}
        />
        <PreviewMode />
      </main>
    )
  }

  // Focus mode
  if (mode === 'focus') {
    return (
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(ellipse 70% 65% at 50% 50%, transparent 0%, rgba(5,5,10,0.4) 60%, rgba(2,2,6,0.75) 100%)',
          }}
        />
        <MiniToolbar
          visible={miniToolbarVisible}
          formatState={formatState}
          onFormatToggle={handleFormatToggle}
          onExit={() => setMode('normal')}
        />
        <div
          className="relative z-0 flex flex-1 flex-col overflow-hidden"
          style={{ background: 'hsl(var(--background))' }}
        >
          <EditorContent focusMode editorRef={editorRef} />
          <FocusStatusBar charCount={charCountNoSpaces} />
        </div>
      </main>
    )
  }

  // Normal mode
  return (
    <main
      className="flex flex-1 overflow-hidden"
      style={{ background: 'hsl(var(--background))' }}
    >
      <div className="flex flex-1 flex-col overflow-hidden">
        <EditorToolbar
          mode={mode}
          onModeChange={handleModeChange}
          workId={activeDocument?.workId}
          workTitle={workTitle}
          chapterTitle={chapterTitle}
          status={status}
          onStatusChange={handleStatusChange}
          onWorkTitleChange={handleWorkTitleChange}
          onChapterTitleChange={handleChapterTitleChange}
          formatState={formatState}
          onFormatToggle={handleFormatToggle}
          editor={getEditor()}
          onVersionHistoryToggle={handleVersionHistoryToggle}
          versionHistoryOpen={versionHistoryOpen}
          onReferencePanelToggle={handleReferencePanelToggle}
          referencePanelOpen={referencePanelOpen}
        />
        <EditorContent focusMode={false} editorRef={editorRef} />
        <EditorStatusBar />
      </div>
      <VersionHistoryPanel
        open={versionHistoryOpen}
        onClose={() => setVersionHistoryOpen(false)}
        chapterId={activeDocument?.chapterId ?? null}
        onContentRestored={handleContentRestored}
      />
      <ReferencePanel
        open={referencePanelOpen}
        onClose={() => setReferencePanelOpen(false)}
        workId={activeDocument?.workId ?? null}
      />
    </main>
  )
}
