import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/useEditorStore'
import { useAppStore } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useWorkStore } from '@/stores/useWorkStore'

export function useAutoSave() {
  const activeDocument = useAppStore((s) => s.activeDocument)
  const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval)
  const savingRef = useRef(false)

  useEffect(() => {
    if (!activeDocument || autoSaveInterval <= 0) return

    const intervalMs = autoSaveInterval * 1000

    const timer = setInterval(async () => {
      const { isDirty, content, charCount, charCountNoSpaces, markClean } = useEditorStore.getState()
      if (!isDirty || savingRef.current) return
      savingRef.current = true

      try {
        if (activeDocument.chapterId) {
          await window.api.chapters.save(activeDocument.chapterId, content, charCount, charCountNoSpaces)
        } else {
          await window.api.works.saveContent(activeDocument.workId, content, charCount, charCountNoSpaces)
        }
        markClean()
        // Update sidebar char count
        useWorkStore.getState().updateWorkCharCount(activeDocument.workId, charCount, charCountNoSpaces)
      } catch {
        // auto-save failed
      } finally {
        savingRef.current = false
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [activeDocument, autoSaveInterval])

  // Also save on unmount if dirty
  useEffect(() => {
    return () => {
      const { isDirty, content, charCount, charCountNoSpaces } = useEditorStore.getState()
      const doc = useAppStore.getState().activeDocument
      if (!isDirty || !doc) return

      if (doc.chapterId) {
        window.api.chapters.save(doc.chapterId, content, charCount, charCountNoSpaces).catch(() => {})
      } else {
        window.api.works.saveContent(doc.workId, content, charCount, charCountNoSpaces).catch(() => {})
      }
      useWorkStore.getState().updateWorkCharCount(doc.workId, charCount, charCountNoSpaces)
    }
  }, [])
}
