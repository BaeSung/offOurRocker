import { useState, useCallback } from 'react'
import { ImageIcon, X, Loader2, Sparkles } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { toast } from '@/hooks/use-toast'
import { ToolbarButton } from './toolbar-button'

export function ImageInsertButton({ editor }: { editor?: Editor | null }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  const { aiProvider, aiImageSize, aiImageQuality, aiImageStyle } = useSettingsStore()

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return
    if (aiProvider === 'none') {
      setError('AI 설정에서 제공자를 선택하고 API 키를 등록하세요.')
      return
    }

    setLoading(true)
    setError('')
    setImageUrl(null)

    try {
      const result = await window.api.ai.generateImage(prompt.trim(), 'openai', {
        size: aiImageSize,
        quality: aiImageQuality,
        style: aiImageStyle,
      })
      if (result.success && result.url) {
        setImageUrl(result.url)
      } else {
        setError(result.error || '이미지 생성에 실패했습니다.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '이미지 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [prompt, aiProvider, aiImageSize, aiImageQuality, aiImageStyle])

  const handleInsert = () => {
    if (!editor || !imageUrl) return
    editor.chain().focus().setImage({ src: imageUrl }).run()
    setPanelOpen(false)
    setPrompt('')
    setImageUrl(null)
    setError('')
    toast({ description: '삽화가 삽입되었습니다.' })
  }

  const handleClose = () => {
    setPanelOpen(false)
    setPrompt('')
    setImageUrl(null)
    setError('')
  }

  return (
    <div className="relative">
      <ToolbarButton
        icon={ImageIcon}
        label="삽화 삽입"
        active={panelOpen}
        onClick={() => setPanelOpen(!panelOpen)}
      />
      {panelOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <h3 className="text-xs font-semibold text-foreground">AI 삽화 생성</h3>
            </div>
            <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="원하는 삽화를 묘사하세요...&#10;예: 어두운 숲 속 오래된 오두막, 수채화 스타일"
              rows={3}
              className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-xs leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
              autoFocus
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="mt-2 flex h-7 w-full items-center justify-center gap-1.5 rounded-md bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  생성 (Ctrl+Enter)
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="px-3 pb-3 text-center text-[11px] text-destructive">
              {error}
            </div>
          )}

          {imageUrl && (
            <div className="border-t border-border p-3">
              <img
                src={imageUrl}
                alt="Generated"
                className="w-full rounded-md border border-border"
              />
              <button
                onClick={handleInsert}
                className="mt-2 flex h-7 w-full items-center justify-center rounded-md bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                본문에 삽입
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
