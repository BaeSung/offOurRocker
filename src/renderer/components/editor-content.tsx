import { useEffect, useState, useCallback, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TipTapEditor } from '@/components/editor/tiptap-editor'
import { useEditorStore } from '@/stores/useEditorStore'
import { useAppStore } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'

interface EditorContentProps {
  focusMode: boolean
  editorRef?: React.MutableRefObject<Editor | null>
}

export function EditorContent({ focusMode, editorRef }: EditorContentProps) {
  const [loadedContent, setLoadedContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const activeDocument = useAppStore((s) => s.activeDocument)
  const { reset } = useEditorStore()

  // Settings
  const fontFamily = useSettingsStore((s) => s.fontFamily)
  const fontSize = useSettingsStore((s) => s.fontSize)
  const lineHeight = useSettingsStore((s) => s.lineHeight)
  const editorWidth = useSettingsStore((s) => s.editorWidth)
  const indent = useSettingsStore((s) => s.indent)

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
      <TipTapEditor
        initialContent={loadedContent}
        focusMode={focusMode}
        editorWidth={editorWidth}
        fontSize={fontSize}
        lineHeight={lineHeight}
        fontFamily={fontFamily}
        indent={indent}
        onReady={handleEditorReady}
      />
    </ScrollArea>
  )
}
