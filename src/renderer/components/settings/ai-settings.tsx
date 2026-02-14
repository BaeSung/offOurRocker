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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettingsStore } from "@/stores/useSettingsStore"

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

function ProviderTab({
  label,
  active,
  onClick,
  disabled,
  badge,
}: {
  label: string
  active: boolean
  onClick: () => void
  disabled?: boolean
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        "relative flex h-9 items-center gap-2 rounded-md px-4 text-xs font-medium transition-all duration-150 " +
        (disabled
          ? "cursor-not-allowed opacity-40"
          : active
            ? "bg-primary text-primary-foreground"
            : "text-secondary-foreground hover:bg-secondary/80")
      }
    >
      {label}
      {badge && (
        <span className="rounded-full bg-muted-foreground/20 px-2 py-0.5 text-[9px] text-muted-foreground">
          {badge}
        </span>
      )}
    </button>
  )
}

export function AISettings() {
  const {
    aiProvider,
    aiModel,
    aiImageShareKey,
    aiImageSize,
    aiImageQuality,
    aiImageStyle,
    setSetting,
  } = useSettingsStore()

  // Local state for key input (only while typing a new key)
  const [openaiKey, setOpenaiKey] = useState("")
  const [anthropicKey, setAnthropicKey] = useState("")
  const [imageKey, setImageKey] = useState("")

  // Masked versions of stored keys
  const [openaiMasked, setOpenaiMasked] = useState("")
  const [anthropicMasked, setAnthropicMasked] = useState("")
  const [imageMasked, setImageMasked] = useState("")

  const [openaiStatus, setOpenaiStatus] = useState<ConnectionStatus>("idle")
  const [anthropicStatus, setAnthropicStatus] = useState<ConnectionStatus>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const activeTab = aiProvider === 'none' ? 'openai' : aiProvider

  // Load stored key masks on mount
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const [oai, ant, img] = await Promise.all([
          window.api.ai.getKey('openai'),
          window.api.ai.getKey('anthropic'),
          window.api.ai.getKey('openai_image'),
        ])
        if (oai.exists) setOpenaiMasked(oai.masked)
        if (ant.exists) setAnthropicMasked(ant.masked)
        if (img.exists) setImageMasked(img.masked)
      } catch (err) {
        console.error('Failed to load API keys:', err)
      }
    }
    loadKeys()
  }, [])

  const handleSaveKey = useCallback(
    async (keyName: string, key: string) => {
      if (!key.trim()) return
      try {
        await window.api.ai.storeKey(keyName, key.trim())
        // Refresh masked display
        const info = await window.api.ai.getKey(keyName)
        if (keyName === 'openai') {
          setOpenaiMasked(info.masked)
          setOpenaiKey("")
        } else if (keyName === 'anthropic') {
          setAnthropicMasked(info.masked)
          setAnthropicKey("")
        } else if (keyName === 'openai_image') {
          setImageMasked(info.masked)
          setImageKey("")
        }
      } catch (err) {
        console.error('Failed to store key:', err)
      }
    },
    []
  )

  const handleDeleteKey = useCallback(async (keyName: string) => {
    try {
      await window.api.ai.deleteKey(keyName)
      if (keyName === 'openai') { setOpenaiMasked(""); setOpenaiKey("") }
      else if (keyName === 'anthropic') { setAnthropicMasked(""); setAnthropicKey("") }
      else if (keyName === 'openai_image') { setImageMasked(""); setImageKey("") }
    } catch (err) {
      console.error('Failed to delete key:', err)
    }
  }, [])

  const handleTest = useCallback(
    async (target: "openai" | "anthropic") => {
      const setStatus = target === "openai" ? setOpenaiStatus : setAnthropicStatus
      const key = target === "openai" ? openaiKey : anthropicKey
      const masked = target === "openai" ? openaiMasked : anthropicMasked

      // If user typed a new key, save it first
      if (key.trim()) {
        await handleSaveKey(target, key)
      }

      // Check that a key exists (either just saved or previously stored)
      if (!key.trim() && !masked) return

      setStatus("loading")
      setErrorMsg("")

      try {
        const result = await window.api.ai.testConnection(target, target)
        if (result.success) {
          setStatus("success")
        } else {
          setStatus("error")
          setErrorMsg(result.error || "연결 실패")
        }
      } catch (err: any) {
        setStatus("error")
        setErrorMsg(err.message || "연결 실패")
      }
    },
    [openaiKey, anthropicKey, openaiMasked, anthropicMasked, handleSaveKey]
  )

  const handleProviderChange = (provider: 'openai' | 'anthropic') => {
    setSetting('aiProvider', provider)
  }

  const handleModelChange = (model: string) => {
    setSetting('aiModel', model)
  }

  // Auto-save key when user leaves the input (blur)
  const handleKeyBlur = (keyName: string, key: string) => {
    if (key.trim()) {
      handleSaveKey(keyName, key)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* LLM */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          LLM (맞춤법/교정)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          AI를 활용한 맞춤법 검사 및 문장 교정 기능입니다. API 키가 필요합니다.
        </p>

        {/* Provider tabs */}
        <div className="mt-4 flex gap-1 rounded-lg bg-secondary/40 p-1">
          <ProviderTab
            label="OpenAI (GPT)"
            active={activeTab === "openai"}
            onClick={() => handleProviderChange("openai")}
          />
          <ProviderTab
            label="Anthropic (Claude)"
            active={activeTab === "anthropic"}
            onClick={() => handleProviderChange("anthropic")}
          />
          <ProviderTab
            label="네이버"
            active={false}
            onClick={() => {}}
            disabled
            badge="준비 중"
          />
        </div>

        {/* OpenAI */}
        {activeTab === "openai" && (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <Label className="text-xs text-secondary-foreground">
                API 키
              </Label>
              <div className="mt-1.5">
                <APIKeyField
                  value={openaiKey}
                  onChange={setOpenaiKey}
                  placeholder="sk-..."
                  masked={openaiMasked}
                  onClear={() => handleDeleteKey('openai')}
                />
              </div>
            </div>
            <ConnectionTestButton
              status={openaiStatus}
              onTest={() => handleTest("openai")}
              disabled={!openaiKey && !openaiMasked}
              errorMsg={errorMsg}
            />
            <div className="w-48">
              <Label className="text-xs text-secondary-foreground">모델</Label>
              <Select value={aiModel || "gpt-4o"} onValueChange={handleModelChange}>
                <SelectTrigger className="mt-1.5 h-9 bg-secondary/60 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Anthropic */}
        {activeTab === "anthropic" && (
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
              onTest={() => handleTest("anthropic")}
              disabled={!anthropicKey && !anthropicMasked}
              errorMsg={errorMsg}
            />
            <div className="w-56">
              <Label className="text-xs text-secondary-foreground">모델</Label>
              <Select
                value={aiModel || "claude-sonnet-4-20250514"}
                onValueChange={handleModelChange}
              >
                <SelectTrigger className="mt-1.5 h-9 bg-secondary/60 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-sonnet-4-20250514">
                    claude-sonnet-4-20250514
                  </SelectItem>
                  <SelectItem value="claude-haiku-4-5-20251001">
                    claude-haiku-4-5-20251001
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </section>

      <Separator className="bg-border/60" />

      {/* Image generation */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          삽화 생성 (AI 이미지)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          AI를 활용한 삽화 생성 기능입니다. 현재 DALL-E만 지원합니다.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {/* Shared key checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="share-key"
              checked={aiImageShareKey}
              onCheckedChange={(v) => setSetting('aiImageShareKey', v === true)}
            />
            <Label
              htmlFor="share-key"
              className="text-xs text-secondary-foreground"
            >
              LLM과 동일한 키 사용
            </Label>
          </div>

          {!aiImageShareKey && (
            <div>
              <Label className="text-xs text-secondary-foreground">
                API 키
              </Label>
              <div className="mt-1.5">
                <APIKeyField
                  value={imageKey}
                  onChange={setImageKey}
                  placeholder="sk-..."
                  masked={imageMasked}
                  onClear={() => handleDeleteKey('openai_image')}
                />
              </div>
              {imageKey && (
                <button
                  onClick={() => handleSaveKey('openai_image', imageKey)}
                  className="mt-2 h-7 rounded-md border border-primary/40 px-3 text-xs text-primary transition-colors hover:bg-primary/10"
                >
                  키 저장
                </button>
              )}
            </div>
          )}

          {/* Image size */}
          <div>
            <Label className="mb-2 block text-xs text-secondary-foreground">
              이미지 크기
            </Label>
            <RadioGroup
              value={aiImageSize}
              onValueChange={(v) => setSetting('aiImageSize', v)}
              className="flex gap-3"
            >
              {[
                { value: "1024x1024", label: "1024x1024", aspect: "1/1" },
                { value: "1792x1024", label: "1792x1024", aspect: "16/9" },
                { value: "1024x1792", label: "1024x1792", aspect: "9/16" },
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

          {/* Image quality */}
          <div>
            <Label className="mb-2 block text-xs text-secondary-foreground">
              이미지 품질
            </Label>
            <RadioGroup
              value={aiImageQuality}
              onValueChange={(v) => setSetting('aiImageQuality', v)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="standard" id="q-standard" />
                <Label htmlFor="q-standard" className="text-xs text-foreground">
                  Standard
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="hd" id="q-hd" />
                <Label htmlFor="q-hd" className="text-xs text-foreground">
                  HD
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Image style */}
          <div>
            <Label className="mb-2 block text-xs text-secondary-foreground">
              이미지 스타일
            </Label>
            <RadioGroup
              value={aiImageStyle}
              onValueChange={(v) => setSetting('aiImageStyle', v)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="natural" id="s-natural" />
                <Label htmlFor="s-natural" className="text-xs text-foreground">
                  Natural
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="vivid" id="s-vivid" />
                <Label htmlFor="s-vivid" className="text-xs text-foreground">
                  Vivid
                </Label>
              </div>
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
