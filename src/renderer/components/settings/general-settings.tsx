import { Check, FolderOpen } from "lucide-react"
import { toast } from '@/hooks/use-toast'
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSettingsStore } from "@/stores/useSettingsStore"

const ACCENT_COLORS = [
  { id: "amber", label: "앰버", color: "hsl(30 40% 64%)" },
  { id: "rose", label: "로즈", color: "hsl(350 60% 60%)" },
  { id: "sage", label: "세이지", color: "hsl(140 25% 55%)" },
  { id: "slate", label: "슬레이트", color: "hsl(215 20% 55%)" },
  { id: "indigo", label: "인디고", color: "hsl(230 55% 60%)" },
]

function ThemeCard({
  label,
  selected,
  onClick,
  bgTop,
  bgBottom,
  textColor,
}: {
  label: string
  selected: boolean
  onClick: () => void
  bgTop: string
  bgBottom: string
  textColor: string
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex flex-col items-center gap-2 rounded-lg border-2 p-2 transition-all duration-150 " +
        (selected
          ? "border-primary bg-secondary/50"
          : "border-border hover:border-muted-foreground/30")
      }
    >
      <div
        className="flex h-16 w-24 flex-col overflow-hidden rounded-md"
        style={{ border: "1px solid hsl(var(--border))" }}
      >
        <div className="flex-1" style={{ background: bgTop }}>
          <div
            className="ml-2 mt-2 h-1 w-8 rounded-full"
            style={{ background: textColor }}
          />
          <div
            className="ml-2 mt-1 h-1 w-12 rounded-full opacity-50"
            style={{ background: textColor }}
          />
        </div>
        <div className="h-3" style={{ background: bgBottom }} />
      </div>
      <span className="text-xs text-foreground">{label}</span>
    </button>
  )
}

export function GeneralSettings() {
  const {
    theme,
    accentColor,
    autoSaveInterval,
    autoBackup,
    backupFrequency,
    saveDirectory,
    backupDirectory,
    openLastWork,
    showStartScreen,
    setSetting,
  } = useSettingsStore()

  const formatInterval = (val: number) => {
    if (val < 60) return `${val}초`
    return `${Math.floor(val / 60)}분`
  }

  const handleSelectDirectory = async (key: 'saveDirectory' | 'backupDirectory') => {
    try {
      const dir = await window.api.system.selectDirectory()
      if (dir) {
        setSetting(key, dir)
      }
    } catch {
      // directory selection failed
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Theme */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">테마</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          앱의 전체적인 외관을 설정합니다.
        </p>
        <div className="mt-4 flex gap-3">
          <ThemeCard
            label="다크 모드"
            selected={theme === "dark"}
            onClick={() => setSetting('theme', 'dark')}
            bgTop="#0f0f17"
            bgBottom="#1a1a2e"
            textColor="#e8e0d0"
          />
          <ThemeCard
            label="라이트 모드"
            selected={theme === "light"}
            onClick={() => setSetting('theme', 'light')}
            bgTop="#faf8f5"
            bgBottom="#f0ede8"
            textColor="#2a2520"
          />
          <ThemeCard
            label="시스템"
            selected={theme === "system"}
            onClick={() => setSetting('theme', 'system')}
            bgTop="linear-gradient(135deg, #0f0f17 50%, #faf8f5 50%)"
            bgBottom="linear-gradient(135deg, #1a1a2e 50%, #f0ede8 50%)"
            textColor="#888"
          />
        </div>
      </section>

      {/* Accent color */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">포인트 컬러</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          강조 색상을 선택합니다.
        </p>
        <div className="mt-3 flex gap-3">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSetting('accentColor', c.id)}
              className="group flex flex-col items-center gap-1.5"
              aria-label={c.label}
            >
              <div
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 " +
                  (accentColor === c.id
                    ? "ring-2 ring-offset-2 ring-offset-background"
                    : "hover:scale-110")
                }
                style={{
                  background: c.color,
                  ...(accentColor === c.id ? { ringColor: c.color } : {}),
                }}
              >
                {accentColor === c.id && (
                  <Check className="h-4 w-4 text-background" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Language */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">언어</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          인터페이스 언어를 선택합니다.
        </p>
        <div className="mt-3 w-48">
          <Select defaultValue="ko">
            <SelectTrigger className="h-9 bg-secondary/60 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ko">한국어</SelectItem>
              <SelectItem value="en" disabled>
                English (준비 중)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Data */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">데이터</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          파일 저장 및 백업 관련 설정입니다.
        </p>
        <div className="mt-4 flex flex-col gap-5">
          {/* Save path */}
          <div>
            <Label className="text-xs text-secondary-foreground">
              저장 위치
            </Label>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 truncate rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                {saveDirectory || "~/Documents/OffOurRocker/works"}
              </div>
              <button
                onClick={() => handleSelectDirectory('saveDirectory')}
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-secondary-foreground transition-colors hover:bg-secondary"
              >
                <FolderOpen className="h-3 w-3" />
                변경
              </button>
            </div>
          </div>

          {/* Auto save interval */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-secondary-foreground">
                자동 저장 간격
              </Label>
              <span className="text-xs font-medium text-primary">
                {formatInterval(autoSaveInterval)}
              </span>
            </div>
            <div className="mt-2">
              <Slider
                value={[autoSaveInterval]}
                onValueChange={([v]) => setSetting('autoSaveInterval', v)}
                min={10}
                max={300}
                step={10}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>10초</span>
                <span>5분</span>
              </div>
            </div>
          </div>

          {/* Auto backup */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-secondary-foreground">
                자동 백업
              </Label>
              <p className="text-[10px] text-muted-foreground">
                정기적으로 작품을 백업합니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {autoBackup && (
                <Select value={backupFrequency} onValueChange={(v) => setSetting('backupFrequency', v as 'daily' | 'weekly')}>
                  <SelectTrigger className="h-7 w-20 bg-secondary/60 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">매일</SelectItem>
                    <SelectItem value="weekly">매주</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Switch
                checked={autoBackup}
                onCheckedChange={(v) => setSetting('autoBackup', v)}
              />
            </div>
          </div>

          {/* Backup path */}
          {autoBackup && (
            <div>
              <Label className="text-xs text-secondary-foreground">
                백업 위치
              </Label>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 truncate rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                  {backupDirectory || "~/Documents/OffOurRocker/backups"}
                </div>
                <button
                  onClick={() => handleSelectDirectory('backupDirectory')}
                  className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-secondary-foreground transition-colors hover:bg-secondary"
                >
                  <FolderOpen className="h-3 w-3" />
                  변경
                </button>
              </div>
            </div>
          )}

          {/* Backup now */}
          <button
            onClick={async () => {
              try {
                const result = await window.api.backup.now(backupDirectory || undefined)
                if (result.success) {
                  toast({ description: '백업이 완료되었습니다.' })
                } else {
                  toast({ description: result.error || '백업에 실패했습니다.', variant: 'destructive' })
                }
              } catch (err) {
                toast({ description: '백업에 실패했습니다.', variant: 'destructive' })
              }
            }}
            className="h-8 w-fit rounded-md border border-primary/40 px-4 text-xs text-primary transition-colors hover:bg-primary/10"
          >
            지금 백업하기
          </button>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Startup */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">시작 설정</h3>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-secondary-foreground">
              시작 시 마지막 작품 열기
            </Label>
            <Switch
              checked={openLastWork}
              onCheckedChange={(v) => setSetting('openLastWork', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-secondary-foreground">
              시작 화면 표시
            </Label>
            <Switch
              checked={showStartScreen}
              onCheckedChange={(v) => setSetting('showStartScreen', v)}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
