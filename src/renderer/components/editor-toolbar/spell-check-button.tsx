import { useState, useCallback } from 'react'
import { CheckCheck } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { SpellCheckPanel } from '@/components/spell-check-panel'
import { ToolbarButton } from './toolbar-button'

export function SpellCheckButton({ editor }: { editor?: Editor | null }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [corrections, setCorrections] = useState<{ original: string; corrected: string; explanation: string }[]>([])
  const [error, setError] = useState('')

  const { aiProvider, aiModel } = useSettingsStore()

  const handleSpellCheck = useCallback(async () => {
    if (!editor) return
    if (aiProvider === 'none') {
      setError('AI 설정에서 제공자를 선택하고 API 키를 등록하세요.')
      setPanelOpen(true)
      return
    }

    const text = editor.getText()
    if (!text || text.trim().length < 5) {
      setError('검사할 텍스트가 충분하지 않습니다.')
      setPanelOpen(true)
      return
    }

    const trimmed = text.length > 3000 ? text.slice(0, 3000) : text
    const model = aiModel || (aiProvider === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-5-20250929')

    setPanelOpen(true)
    setLoading(true)
    setError('')
    setCorrections([])

    try {
      const result = await window.api.ai.spellCheck(trimmed, aiProvider, model, aiProvider)
      if (result.success && result.corrections) {
        setCorrections(result.corrections)
      } else {
        setError(result.error || '맞춤법 검사에 실패했습니다.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '맞춤법 검사에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [editor, aiProvider, aiModel])

  const handleApply = (original: string, corrected: string) => {
    if (!editor) return
    const { state } = editor
    const { doc } = state

    let pos = 0
    let found = false
    doc.descendants((node, nodePos) => {
      if (found) return false
      if (node.isText) {
        const nodeText = node.text || ''
        const localIdx = nodeText.indexOf(original)
        if (localIdx !== -1) {
          pos = nodePos + localIdx
          found = true
          return false
        }
      }
    })

    if (found) {
      editor
        .chain()
        .focus()
        .insertContentAt(
          { from: pos, to: pos + original.length },
          corrected
        )
        .run()
    }
  }

  const handleApplyAll = () => {
    for (const c of corrections) {
      handleApply(c.original, c.corrected)
    }
  }

  return (
    <div className="relative">
      <ToolbarButton
        icon={CheckCheck}
        label="맞춤법 검사"
        active={panelOpen}
        onClick={handleSpellCheck}
      />
      <SpellCheckPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        loading={loading}
        corrections={corrections}
        error={error}
        onApply={handleApply}
        onApplyAll={handleApplyAll}
      />
    </div>
  )
}
