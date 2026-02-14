import { useEffect, useRef } from 'react'
import { useEditorStore } from '@/stores/useEditorStore'
import { useAppStore } from '@/stores/useAppStore'
import { useSettingsStore } from '@/stores/useSettingsStore'

export function useAutoSave() {
  const { isDirty, content, markClean } = useEditorStore()
  const activeDocument = useAppStore((s) => s.activeDocument)
  const autoSaveInterval = useSettingsStore((s) => s.autoSaveInterval)
  const savingRef = useRef(false)

  useEffect(() => {
    if (!activeDocument || autoSaveInterval <= 0) return

    const intervalMs = autoSaveInterval * 1000

    const timer = setInterval(async () => {
      if (!isDirty || savingRef.current) return
      savingRef.current = true

      try {
        if (activeDocument.chapterId) {
          await window.api.chapters.save(activeDocument.chapterId, content)
        } else {
          await window.api.works.saveContent(activeDocument.workId, content)
        }
        markClean()
      } catch (err) {
        console.error('[AutoSave] Error:', err)
      } finally {
        savingRef.current = false
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [activeDocument, autoSaveInterval, isDirty, content, markClean])

  // Also save on unmount if dirty
  useEffect(() => {
    return () => {
      const { isDirty, content } = useEditorStore.getState()
      const doc = useAppStore.getState().activeDocument
      if (!isDirty || !doc) return

      if (doc.chapterId) {
        window.api.chapters.save(doc.chapterId, content).catch(console.error)
      } else {
        window.api.works.saveContent(doc.workId, content).catch(console.error)
      }
    }
  }, [])
}
