import { useState } from "react"
import { RefreshCw, Trash2, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/stores/useSettingsStore"

interface ImageBlockProps {
  caption: string
  src?: string
  onImageChange?: (url: string) => void
  onDelete?: () => void
}

export function ImageBlock({ caption, src, onImageChange, onDelete }: ImageBlockProps) {
  const [hovered, setHovered] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [imageUrl, setImageUrl] = useState(src || '')
  const [error, setError] = useState('')

  const { aiProvider, aiImageShareKey, aiImageSize, aiImageQuality, aiImageStyle } = useSettingsStore()

  const handleGenerate = async () => {
    // Determine which key to use
    const keyName = aiImageShareKey && aiProvider === 'openai' ? 'openai' : 'openai_image'

    setGenerating(true)
    setError('')

    try {
      const result = await window.api.ai.generateImage(
        caption || 'A literary illustration in a subtle, painterly style',
        keyName,
        {
          size: aiImageSize,
          quality: aiImageQuality,
          style: aiImageStyle,
        }
      )

      if (result.success && result.url) {
        setImageUrl(result.url)
        onImageChange?.(result.url)
      } else {
        setError(result.error || '이미지 생성에 실패했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '이미지 생성에 실패했습니다.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <figure
      className="my-8 flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative w-full max-w-[600px] overflow-hidden rounded-md">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={caption}
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          /* Gradient placeholder image */
          <div
            className="aspect-[16/9] w-full"
            style={{
              background:
                "linear-gradient(135deg, #0a0a1a 0%, #0f1a2e 25%, #0a1628 50%, #141e30 75%, #0a0a1a 100%)",
            }}
          >
            {/* Flashlight beam effect */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 30% 60% at 55% 35%, rgba(255,220,150,0.15) 0%, rgba(255,200,100,0.05) 40%, transparent 70%)",
              }}
            />
            {/* Rock texture hints */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1/3"
              style={{
                background:
                  "linear-gradient(to top, rgba(40,35,30,0.6) 0%, transparent 100%)",
              }}
            />
            {/* Subtle wave lines */}
            <svg
              className="absolute bottom-1/4 left-0 w-full opacity-10"
              viewBox="0 0 600 40"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 20 Q75 5 150 20 Q225 35 300 20 Q375 5 450 20 Q525 35 600 20"
                stroke="hsl(var(--foreground))"
                strokeWidth="1"
              />
              <path
                d="M0 28 Q75 13 150 28 Q225 43 300 28 Q375 13 450 28 Q525 43 600 28"
                stroke="hsl(var(--foreground))"
                strokeWidth="0.5"
              />
            </svg>
          </div>
        )}

        {/* Generating overlay */}
        {generating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">이미지 생성 중...</span>
          </div>
        )}

        {/* Error overlay */}
        {error && !generating && (
          <div className="absolute inset-x-0 bottom-0 bg-destructive/90 px-3 py-2 text-center text-xs text-destructive-foreground">
            {error}
          </div>
        )}

        {/* Hover overlay */}
        {!generating && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 bg-background/60 backdrop-blur-[2px] transition-opacity duration-200",
              hovered ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <RefreshCw className="h-3 w-3" />
              {"교체"}
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
              >
                <Trash2 className="h-3 w-3" />
                {"삭제"}
              </button>
            )}
            <button
              onClick={handleGenerate}
              className="flex items-center gap-1.5 rounded-md bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary"
            >
              <Sparkles className="h-3 w-3" />
              {"AI 생성"}
            </button>
          </div>
        )}
      </div>
      <figcaption className="mt-3 w-full max-w-[600px] text-center text-[13px] italic leading-relaxed text-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  )
}
