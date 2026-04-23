import { useState, useCallback, useEffect } from "react"
import {
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettingsStore } from "@/stores/useSettingsStore"
import { toast } from "@/hooks/use-toast"

type ConnectionStatus = "idle" | "loading" | "success" | "error"

function APIKeyField({
  value,
  onChange,
  placeholder,
  masked,
  onClear,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  masked?: string
  onClear?: () => void
}) {
  const [visible, setVisible] = useState(false)

  // If there's a stored key (masked) and user hasn't typed a new one
  if (masked && !value) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 truncate rounded-md border border-border bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
          {masked}
        </div>
        <button
          onClick={onClear}
          className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          삭제
        </button>
        <button
          onClick={() => onChange('')}
          className="shrink-0 rounded-md border border-primary/40 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
        >
          변경
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "sk-..."}
        className="h-9 w-full rounded-md border border-border bg-secondary/60 px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={visible ? "숨기기" : "보기"}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

function ConnectionTestButton({
  status,
  onTest,
  disabled,
  errorMsg,
}: {
  status: ConnectionStatus
  onTest: () => void
  disabled?: boolean
  errorMsg?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onTest}
        disabled={disabled || status === "loading"}
        className="flex h-8 items-center gap-2 rounded-md border border-primary/40 px-3 text-xs text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {status === "loading" && (
          <Loader2 className="h-3 w-3 animate-spin" />
        )}
        연결 테스트
      </button>
      {status === "success" && (
        <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(140 60% 50%)" }}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          연결 성공
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          {errorMsg || "연결 실패 - API 키를 확인하세요"}
        </span>
      )}
    </div>
  )
}

export function AISettings() {
  const {
    aiProvider,
    aiModel,
    betaReadModel,
    spacingModel,
    aiImageSize,
    setSetting,
  } = useSettingsStore()

  const [anthropicKey, setAnthropicKey] = useState("")
  const [imageKey, setImageKey] = useState("")

  const [anthropicMasked, setAnthropicMasked] = useState("")
  const [imageMasked, setImageMasked] = useState("")

  const [anthropicStatus, setAnthropicStatus] = useState<ConnectionStatus>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // Load stored key masks on mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const [ant, img, legacyImg, legacyOai] = await Promise.all([
          window.api.ai.getKey('anthropic'),
          window.api.ai.getKey('google_image'),
          window.api.ai.getKey('openai_image'),
          window.api.ai.getKey('openai'),
        ])
        if (ant.exists) setAnthropicMasked(ant.masked)
        if (img.exists) setImageMasked(img.masked)
        if (legacyImg.exists && !img.exists) {
          toast({
            description:
              '삽화 생성이 Gemini (Nano Banana)로 변경되었습니다. Google AI Studio에서 발급한 API 키를 새로 등록하세요.',
          })
          window.api.ai.deleteKey('openai_image').catch(() => {})
        }
        if (legacyOai.exists) {
          toast({
            description:
              'OpenAI(GPT) 지원이 중단되었습니다. LLM은 Anthropic Claude만 사용합니다.',
          })
          window.api.ai.deleteKey('openai').catch(() => {})
          if ((aiProvider as string) !== 'anthropic') {
            setSetting('aiProvider', ant.exists ? 'anthropic' : 'none')
          }
        }
      } catch {
        // load failed
      }
    }
    loadKeys()
  }, [aiProvider, setSetting])

  const handleSaveKey = useCallback(
    async (keyName: string, key: string) => {
      if (!key.trim()) return
      try {
        await window.api.ai.storeKey(keyName, key.trim())
        const info = await window.api.ai.getKey(keyName)
        if (keyName === 'anthropic') {
          setAnthropicMasked(info.masked)
          setAnthropicKey("")
          setSetting('aiProvider', 'anthropic')
        } else if (keyName === 'google_image') {
          setImageMasked(info.masked)
          setImageKey("")
        }
      } catch {
        // store failed
      }
    },
    [setSetting]
  )

  const handleDeleteKey = useCallback(async (keyName: string) => {
    try {
      await window.api.ai.deleteKey(keyName)
      if (keyName === 'anthropic') {
        setAnthropicMasked("")
        setAnthropicKey("")
        setSetting('aiProvider', 'none')
      } else if (keyName === 'google_image') {
        setImageMasked("")
        setImageKey("")
      }
    } catch {
      // delete failed
    }
  }, [setSetting])

  const handleTestAnthropic = useCallback(async () => {
    if (anthropicKey.trim()) {
      await handleSaveKey('anthropic', anthropicKey)
    }
    if (!anthropicKey.trim() && !anthropicMasked) return

    setAnthropicStatus("loading")
    setErrorMsg("")

    try {
      const result = await window.api.ai.testConnection('anthropic')
      if (result.success) {
        setAnthropicStatus("success")
      } else {
        setAnthropicStatus("error")
        setErrorMsg(result.error || "연결 실패")
      }
    } catch (err: unknown) {
      setAnthropicStatus("error")
      setErrorMsg(err instanceof Error ? err.message : "연결 실패")
    }
  }, [anthropicKey, anthropicMasked, handleSaveKey])

  const handleModelChange = (model: string) => {
    setSetting('aiModel', model)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* LLM */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          LLM (맞춤법/교정)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Anthropic Claude를 사용합니다. API 키가 필요합니다.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <Label className="text-xs text-secondary-foreground">
              API 키
            </Label>
            <div className="mt-1.5">
              <APIKeyField
                value={anthropicKey}
                onChange={setAnthropicKey}
                placeholder="sk-ant-..."
                masked={anthropicMasked}
                onClear={() => handleDeleteKey('anthropic')}
              />
            </div>
          </div>
          <ConnectionTestButton
            status={anthropicStatus}
            onTest={handleTestAnthropic}
            disabled={!anthropicKey && !anthropicMasked}
            errorMsg={errorMsg}
          />
          <div className="w-56">
            <Label className="text-xs text-secondary-foreground">모델</Label>
            <Select
              value={aiModel || "claude-sonnet-4-6"}
              onValueChange={handleModelChange}
            >
              <SelectTrigger className="mt-1.5 h-9 bg-secondary/60 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-sonnet-4-6">claude-sonnet-4-6</SelectItem>
                <SelectItem value="claude-haiku-4-5-20251001">
                  claude-haiku-4-5-20251001
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Beta reading model */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">베타리딩 모델</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          AI 베타리딩에서 사용할 모델입니다. 맞춤법보다 고급 모델을 쓰는 걸 권장합니다. 비워두면 위 LLM 모델이 사용됩니다.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <input
            value={betaReadModel}
            onChange={(e) => setSetting('betaReadModel', e.target.value)}
            placeholder="claude-opus-4-7"
            className="h-9 w-80 rounded-md border border-border bg-secondary/60 px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Opus 4.7', value: 'claude-opus-4-7' },
              { label: 'Sonnet 4.6', value: 'claude-sonnet-4-6' },
              { label: 'Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setSetting('betaReadModel', p.value)}
                className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Spacing model */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">띄어쓰기 모델</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          자동 띄어쓰기 교정과 수동 교정 버튼에서 사용할 모델입니다. 싸고 빠른 모델을 권장합니다. 비워두면 Haiku 4.5가 사용됩니다.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <input
            value={spacingModel}
            onChange={(e) => setSetting('spacingModel', e.target.value)}
            placeholder="claude-haiku-4-5-20251001"
            className="h-9 w-80 rounded-md border border-border bg-secondary/60 px-3 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Haiku 4.5', value: 'claude-haiku-4-5-20251001' },
              { label: 'Sonnet 4.6', value: 'claude-sonnet-4-6' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setSetting('spacingModel', p.value)}
                className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Image generation */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          삽화 생성 (AI 이미지)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Google Gemini 2.5 Flash Image (Nano Banana)를 사용합니다. Google AI Studio에서 발급한 API 키가 필요합니다.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <Label className="text-xs text-secondary-foreground">
              API 키
            </Label>
            <div className="mt-1.5">
              <APIKeyField
                value={imageKey}
                onChange={setImageKey}
                placeholder="AIza..."
                masked={imageMasked}
                onClear={() => handleDeleteKey('google_image')}
              />
            </div>
            {imageKey && (
              <button
                onClick={() => handleSaveKey('google_image', imageKey)}
                className="mt-2 h-7 rounded-md border border-primary/40 px-3 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                키 저장
              </button>
            )}
          </div>

          {/* Image aspect ratio */}
          <div>
            <Label className="mb-2 block text-xs text-secondary-foreground">
              화면비
            </Label>
            <RadioGroup
              value={aiImageSize}
              onValueChange={(v) => setSetting('aiImageSize', v)}
              className="flex gap-3"
            >
              {[
                { value: "1024x1024", label: "1:1", aspect: "1/1" },
                { value: "1792x1024", label: "16:9", aspect: "16/9" },
                { value: "1024x1792", label: "9:16", aspect: "9/16" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={
                    "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-3 transition-all duration-150 " +
                    (aiImageSize === opt.value
                      ? "border-primary bg-secondary/50"
                      : "border-border hover:border-muted-foreground/30")
                  }
                >
                  <div
                    className="rounded-sm bg-muted-foreground/20"
                    style={{
                      width: opt.aspect === "9/16" ? "18px" : "32px",
                      height: opt.aspect === "16/9" ? "18px" : "32px",
                    }}
                  />
                  <div className="flex items-center gap-1.5">
                    <RadioGroupItem value={opt.value} id={`sz-${opt.value}`} />
                    <span className="text-[10px] text-secondary-foreground">
                      {opt.label}
                    </span>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>
      </section>

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-lg bg-secondary/40 p-3">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          API 키는 이 컴퓨터에 암호화되어 저장됩니다. 외부로 전송되지 않으며, AI
          요청 시에만 해당 서비스에 직접 전달됩니다.
        </p>
      </div>
    </div>
  )
}
