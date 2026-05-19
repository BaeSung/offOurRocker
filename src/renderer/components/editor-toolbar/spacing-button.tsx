import { useCallback, useState } from 'react'
import { Space } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from '@/hooks/use-toast'
import {
  applySpacingOpsAt,
  spacingDiff,
} from '@/components/editor/use-auto-spacing'
import { MAX_AI_INPUT_CHARS } from '../../../shared/types'
import { ToolbarButton } from './toolbar-button'

export function SpacingButton({ editor }: { editor?: Editor | null }) {
  const [running, setRunning] = useState(false)
  const aiProvider = useSettingsStore((s) => s.aiProvider)
  const spacingModel = useSettingsStore((s) => s.spacingModel)

  const effectiveModel = spacingModel || 'claude-haiku-4-5-20251001'

  const handleClick = useCallback(async () => {
    if (!editor) return
    if (aiProvider === 'none') {
      toast({
        description: 'AI 설정에서 Claude API 키를 등록하세요.',
        variant: 'destructive',
      })
      return
    }

    const { $from } = editor.state.selection
    const depth = $from.depth
    if (depth < 1) return
    const node = $from.node(depth)
    if (!node.isTextblock) {
      toast({ description: '텍스트 문단에서만 사용할 수 있습니다.' })
      return
    }
    const origText = node.textContent
    if (!origText || origText.trim().length < 2) {
      toast({ description: '교정할 내용이 없습니다.' })
      return
    }
    if (origText.length > MAX_AI_INPUT_CHARS) {
      toast({
        description: `문단이 ${MAX_AI_INPUT_CHARS.toLocaleString()}자를 초과합니다.`,
        variant: 'destructive',
      })
      return
    }
    const blockStart = $from.start(depth)

    setRunning(true)
    try {
      const result = await window.api.ai.checkSpacing(
        origText,
        effectiveModel,
        'anthropic'
      )
      if (!result.success || !result.corrected) {
        toast({
          description: result.error || '교정에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }
      if (result.corrected === origText) {
        toast({ description: '교정할 띄어쓰기가 없습니다.' })
        return
      }
      // Verify block still has the same text
      const currentNode = editor.state.doc.resolve(blockStart).parent
      if (currentNode?.textContent !== origText) {
        toast({ description: '본문이 변경되어 적용을 건너뛰었습니다.' })
        return
      }
      const ops = spacingDiff(origText, result.corrected)
      if (ops.length === 0) {
        toast({ description: '변경 사항이 없습니다.' })
        return
      }
      applySpacingOpsAt(editor, blockStart, ops)
      toast({ description: `${ops.length}곳의 띄어쓰기를 교정했습니다.` })
    } catch (err: unknown) {
      toast({
        description: err instanceof Error ? err.message : '교정 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setRunning(false)
    }
  }, [editor, aiProvider, effectiveModel])

  return (
    <ToolbarButton
      icon={Space}
      label={running ? '교정 중...' : '현재 문단 띄어쓰기 교정'}
      active={running}
      onClick={handleClick}
    />
  )
}
