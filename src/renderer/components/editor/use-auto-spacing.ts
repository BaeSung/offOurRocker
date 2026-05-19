import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { MAX_AI_INPUT_CHARS } from '../../../shared/types'

interface UseAutoSpacingOptions {
  enabled: boolean
  model: string
  keyName: string
  debounceMs?: number
}

interface SpacingOp {
  type: 'insert' | 'delete'
  at: number
  char?: string
}

export function stripWs(s: string): string {
  return s.replace(/\s+/g, '')
}

export function spacingDiff(orig: string, corr: string): SpacingOp[] {
  const ops: SpacingOp[] = []
  let i = 0
  let j = 0
  while (i < orig.length || j < corr.length) {
    if (i < orig.length && j < corr.length && orig[i] === corr[j]) {
      i++
      j++
      continue
    }
    if (i < orig.length && /\s/.test(orig[i]) && (j >= corr.length || orig[i] !== corr[j])) {
      ops.push({ type: 'delete', at: i })
      i++
      continue
    }
    if (j < corr.length && /\s/.test(corr[j])) {
      ops.push({ type: 'insert', at: i, char: corr[j] })
      j++
      continue
    }
    return []
  }
  return ops
}

export function applySpacingOpsAt(
  editor: Editor,
  blockStart: number,
  ops: SpacingOp[]
): void {
  if (ops.length === 0) return
  const tr = editor.state.tr
  for (let k = ops.length - 1; k >= 0; k--) {
    const op = ops[k]
    const pos = blockStart + op.at
    if (op.type === 'insert') {
      tr.insertText(op.char ?? ' ', pos)
    } else {
      tr.delete(pos, pos + 1)
    }
  }
  tr.setMeta('addToHistory', true)
  tr.setMeta('autoSpacing', true)
  editor.view.dispatch(tr)
}

function applyCorrection(editor: Editor, origText: string, corrected: string): boolean {
  const { $from } = editor.state.selection
  const depth = $from.depth
  if (depth < 1) return false
  const node = $from.node(depth)
  if (!node.isTextblock) return false
  if (node.type.name === 'codeBlock') return false
  if (node.textContent !== origText) return false

  const ops = spacingDiff(origText, corrected)
  if (ops.length === 0) return false

  const blockStart = $from.start(depth)
  applySpacingOpsAt(editor, blockStart, ops)
  return true
}

export function useAutoSpacing(editor: Editor | null, options: UseAutoSpacingOptions): void {
  const timerRef = useRef<number | null>(null)
  const runningRef = useRef(false)
  const lastCheckedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!editor) return
    if (!options.enabled) return
    if (!options.model) return

    const debounceMs = options.debounceMs ?? 3000

    const run = async () => {
      if (runningRef.current) {
        schedule()
        return
      }
      const { selection } = editor.state
      if (!selection.empty) return
      const { $from } = selection
      const depth = $from.depth
      if (depth < 1) return
      const node = $from.node(depth)
      if (!node.isTextblock) return
      if (node.type.name === 'codeBlock') return

      const origText = node.textContent
      if (!origText || origText.trim().length < 4) return
      if (origText.length > MAX_AI_INPUT_CHARS) return
      if (origText === lastCheckedRef.current) return

      runningRef.current = true
      try {
        const result = await window.api.ai.checkSpacing(
          origText,
          options.model,
          options.keyName
        )
        if (!result.success || !result.corrected) {
          // 같은 입력에 대한 무한 재시도 방지
          lastCheckedRef.current = origText
          if (result.error) console.warn('[auto-spacing] LLM 폐기:', result.error)
          return
        }
        if (result.corrected === origText) {
          lastCheckedRef.current = origText
          return
        }
        if (stripWs(result.corrected) !== stripWs(origText)) {
          lastCheckedRef.current = origText
          console.warn('[auto-spacing] stripWs 불일치로 건너뜀')
          return
        }
        const applied = applyCorrection(editor, origText, result.corrected)
        if (applied) lastCheckedRef.current = result.corrected
        else lastCheckedRef.current = origText
      } catch (err) {
        // 네트워크 오류는 일시적일 수 있으니 lastCheckedRef는 그대로 두고 다음 타이핑에 재시도
        console.warn('[auto-spacing] 네트워크/API 오류:', err)
      } finally {
        runningRef.current = false
      }
    }

    const schedule = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(run, debounceMs)
    }

    const onUpdate = ({ transaction }: { transaction: { getMeta: (key: string) => unknown } }) => {
      if (transaction.getMeta('autoSpacing')) return
      schedule()
    }

    editor.on('update', onUpdate)

    return () => {
      editor.off('update', onUpdate)
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [editor, options.enabled, options.model, options.keyName, options.debounceMs])
}
