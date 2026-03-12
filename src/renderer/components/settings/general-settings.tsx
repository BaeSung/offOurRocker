import { useState, useEffect } from "react"
import { Check, FolderOpen, Upload, Download, Loader2, GitBranch, CloudUpload, CloudDownload, History, RotateCcw } from "lucide-react"
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
    gitSaveEnabled,
    gitRepoPath,
    gitRemoteUrl,
    gitAutoPush,
    setSetting,
  } = useSettingsStore()

  const [defaultPaths, setDefaultPaths] = useState({ backup: '', save: '', export: '' })

  useEffect(() => {
    window.api.system.getDefaultPaths().then(setDefaultPaths).catch(() => {})
  }, [])

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
                {saveDirectory || defaultPaths.save || '기본 경로'}
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
                  {backupDirectory || defaultPaths.backup || '기본 경로'}
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

      {/* DB Export / Import */}
      <DataTransferSection />

      <Separator className="bg-border/60" />

      {/* Git Save */}
      <GitSaveSection
        gitSaveEnabled={gitSaveEnabled}
        gitRepoPath={gitRepoPath}
        gitRemoteUrl={gitRemoteUrl}
        gitAutoPush={gitAutoPush}
        setSetting={setSetting}
        defaultSavePath={defaultPaths.save}
      />

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

function DataTransferSection() {
  const [loading, setLoading] = useState<'export' | 'import' | null>(null)

  const handleExport = async () => {
    setLoading('export')
    try {
      const result = await window.api.database.export()
      if (result.canceled) return
      if (result.success) {
        toast({ description: `데이터를 내보냈습니다: ${result.path}` })
      } else {
        toast({ description: result.error || '내보내기에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: '내보내기에 실패했습니다.', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  const handleImport = async () => {
    setLoading('import')
    try {
      const result = await window.api.database.import()
      if (result.canceled) return
      if (result.success) {
        // app.relaunch() + app.exit() handles restart from main process
        return
      } else {
        toast({ description: result.error || '가져오기에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: '가져오기에 실패했습니다.', variant: 'destructive' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground">데이터 이동</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        PC를 바꾸거나 데이터를 옮길 때 사용합니다. 모든 작품, 챕터, 인물, 세계관 데이터가 포함됩니다.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={handleExport}
          disabled={loading !== null}
          className="flex h-9 items-center gap-2 rounded-md border border-border px-4 text-xs text-secondary-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {loading === 'export' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          데이터 내보내기
        </button>
        <button
          onClick={handleImport}
          disabled={loading !== null}
          className="flex h-9 items-center gap-2 rounded-md border border-border px-4 text-xs text-secondary-foreground transition-colors hover:bg-secondary disabled:opacity-50"
        >
          {loading === 'import' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          데이터 가져오기
        </button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        가져오기 시 현재 데이터가 덮어씌워집니다. 먼저 내보내기로 백업해두세요.
      </p>
    </section>
  )
}

function GitSaveSection({
  gitSaveEnabled,
  gitRepoPath,
  gitRemoteUrl,
  gitAutoPush,
  setSetting,
  defaultSavePath,
}: {
  gitSaveEnabled: boolean
  gitRepoPath: string
  gitRemoteUrl: string
  gitAutoPush: boolean
  setSetting: (key: string, value: unknown) => void
  defaultSavePath: string
}) {
  const [gitInstalled, setGitInstalled] = useState<boolean | null>(null)
  const [lastCommit, setLastCommit] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [remoteInput, setRemoteInput] = useState(gitRemoteUrl)
  const [savingRemote, setSavingRemote] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [commits, setCommits] = useState<{ hash: string; message: string; date: string }[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)
  const [showConflict, setShowConflict] = useState(false)
  const [resolving, setResolving] = useState(false)

  useEffect(() => {
    window.api.git.check().then((r: { installed: boolean }) => setGitInstalled(r.installed)).catch(() => setGitInstalled(false))
  }, [])

  useEffect(() => {
    if (gitSaveEnabled) {
      refreshStatus()
    }
  }, [gitSaveEnabled, gitRepoPath])

  const refreshStatus = async () => {
    try {
      const s = await window.api.git.status(gitRepoPath || undefined)
      setLastCommit(s.lastCommit?.date ?? null)
    } catch {
      setLastCommit(null)
    }
  }

  const handleEnable = async (enabled: boolean) => {
    if (enabled) {
      setInitializing(true)
      try {
        await window.api.git.init(gitRepoPath || undefined)
        setSetting('gitSaveEnabled', true)
        await refreshStatus()
      } catch {
        toast({ description: 'Git 저장소 초기화에 실패했습니다.', variant: 'destructive' })
      } finally {
        setInitializing(false)
      }
    } else {
      setSetting('gitSaveEnabled', false)
    }
  }

  const handleCommitNow = async () => {
    setCommitting(true)
    try {
      const result = await window.api.git.commit(gitRepoPath || undefined)
      if (result.success) {
        toast({ description: result.message === '변경 사항 없음' ? '변경 사항이 없습니다.' : 'Git 커밋 완료!' })
        await refreshStatus()
      } else {
        toast({ description: result.error || '커밋에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: '커밋에 실패했습니다.', variant: 'destructive' })
    } finally {
      setCommitting(false)
    }
  }

  const handleSelectGitPath = async () => {
    try {
      const dir = await window.api.system.selectDirectory()
      if (dir) {
        setSetting('gitRepoPath', dir)
      }
    } catch {
      // cancelled
    }
  }

  const handleSaveRemote = async () => {
    if (!remoteInput.trim()) return
    setSavingRemote(true)
    try {
      const result = await window.api.git.setRemote(remoteInput.trim(), gitRepoPath || undefined)
      if (result.success) {
        setSetting('gitRemoteUrl', remoteInput.trim())
        toast({ description: '원격 저장소가 설정되었습니다.' })
      } else {
        toast({ description: result.error || 'Remote 설정에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: 'Remote 설정에 실패했습니다.', variant: 'destructive' })
    } finally {
      setSavingRemote(false)
    }
  }

  const handlePullNow = async () => {
    setPulling(true)
    try {
      const result = await window.api.git.pull(gitRepoPath || undefined)
      if (result.success) {
        toast({ description: 'Pull 완료! 변경 사항을 적용하려면 앱을 재시작해주세요.' })
        await refreshStatus()
      } else if (result.conflict) {
        setShowConflict(true)
      } else {
        toast({ description: result.error || 'Pull에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: 'Pull에 실패했습니다.', variant: 'destructive' })
    } finally {
      setPulling(false)
    }
  }

  const handleResolveConflict = async (strategy: 'ours' | 'theirs') => {
    setResolving(true)
    try {
      const result = await window.api.git.resolveConflict(strategy, gitRepoPath || undefined)
      if (result.success) {
        setShowConflict(false)
        if (strategy === 'theirs') {
          // App will restart automatically
          return
        }
        toast({ description: '충돌이 해결되었습니다. 내 버전이 유지됩니다.' })
        await refreshStatus()
      } else {
        toast({ description: result.error || '충돌 해결에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: '충돌 해결에 실패했습니다.', variant: 'destructive' })
    } finally {
      setResolving(false)
    }
  }

  const handleLoadHistory = async () => {
    if (showHistory) {
      setShowHistory(false)
      return
    }
    setLoadingHistory(true)
    try {
      const result = await window.api.git.log(30, gitRepoPath || undefined)
      setCommits(result.commits)
      setShowHistory(true)
    } catch {
      toast({ description: '히스토리를 불러올 수 없습니다.', variant: 'destructive' })
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleRestore = async (hash: string) => {
    if (!confirm('이 버전으로 복원하시겠습니까?\n현재 데이터를 덮어쓰며, 앱이 재시작됩니다.')) return
    setRestoring(hash)
    try {
      const result = await window.api.git.restore(hash, gitRepoPath || undefined)
      if (result.success) {
        // main process will app.relaunch() + app.exit(0)
        return
      } else {
        toast({ description: result.error || '복원에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: '복원에 실패했습니다.', variant: 'destructive' })
    } finally {
      setRestoring(null)
    }
  }

  const handlePushNow = async () => {
    setPushing(true)
    try {
      const result = await window.api.git.push(gitRepoPath || undefined)
      if (result.success) {
        toast({ description: 'Push 완료!' })
      } else {
        toast({ description: result.error || 'Push에 실패했습니다.', variant: 'destructive' })
      }
    } catch {
      toast({ description: 'Push에 실패했습니다.', variant: 'destructive' })
    } finally {
      setPushing(false)
    }
  }

  if (gitInstalled === null) return null

  return (
    <section>
      <h3 className="text-sm font-semibold text-foreground">Git 저장</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        저장할 때마다 DB 파일을 Git으로 자동 커밋합니다. 변경 이력을 관리할 수 있습니다.
      </p>

      {!gitInstalled ? (
        <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Git이 설치되어 있지 않습니다. Git을 설치한 후 앱을 다시 시작해주세요.
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs text-secondary-foreground">
                자동 Git 커밋
              </Label>
            </div>
            <Switch
              checked={gitSaveEnabled}
              onCheckedChange={handleEnable}
              disabled={initializing}
            />
          </div>

          {gitSaveEnabled && (
            <>
              {/* Repo path */}
              <div>
                <Label className="text-xs text-secondary-foreground">
                  Git 저장소 경로
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 truncate rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                    {gitRepoPath || defaultSavePath || '기본 경로 (앱 데이터 폴더)'}
                  </div>
                  <button
                    onClick={handleSelectGitPath}
                    className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-secondary-foreground transition-colors hover:bg-secondary"
                  >
                    <FolderOpen className="h-3 w-3" />
                    변경
                  </button>
                </div>
              </div>

              {/* Status */}
              {lastCommit && (
                <p className="text-[10px] text-muted-foreground">
                  마지막 커밋: {new Date(lastCommit).toLocaleString('ko-KR')}
                </p>
              )}

              {/* Commit now */}
              <button
                onClick={handleCommitNow}
                disabled={committing}
                className="h-8 w-fit rounded-md border border-primary/40 px-4 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                {committing ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    커밋 중...
                  </span>
                ) : (
                  '지금 커밋하기'
                )}
              </button>

              <Separator className="bg-border/40" />

              {/* Remote URL */}
              <div>
                <Label className="text-xs text-secondary-foreground">
                  원격 저장소 URL
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  GitHub 등 원격 저장소 주소를 입력합니다. SSH 또는 HTTPS URL을 사용할 수 있습니다.
                </p>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={remoteInput}
                    onChange={(e) => setRemoteInput(e.target.value)}
                    placeholder="https://github.com/user/repo.git"
                    className="flex-1 rounded-md bg-secondary/60 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-primary/40"
                  />
                  <button
                    onClick={handleSaveRemote}
                    disabled={savingRemote || !remoteInput.trim()}
                    className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-secondary-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                  >
                    {savingRemote ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      '저장'
                    )}
                  </button>
                </div>
                {gitRemoteUrl && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    현재: {gitRemoteUrl}
                  </p>
                )}
              </div>

              {/* Auto push toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CloudUpload className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-secondary-foreground">
                      자동 Push
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      커밋 후 자동으로 원격 저장소에 Push합니다.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={gitAutoPush}
                  onCheckedChange={(v) => setSetting('gitAutoPush', v)}
                  disabled={!gitRemoteUrl}
                />
              </div>

              {/* Push / Pull buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePushNow}
                  disabled={pushing || !gitRemoteUrl}
                  className="h-8 rounded-md border border-primary/40 px-4 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                >
                  {pushing ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Push 중...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CloudUpload className="h-3 w-3" />
                      Push
                    </span>
                  )}
                </button>
                <button
                  onClick={handlePullNow}
                  disabled={pulling || !gitRemoteUrl}
                  className="h-8 rounded-md border border-primary/40 px-4 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                >
                  {pulling ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Pull 중...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <CloudDownload className="h-3 w-3" />
                      Pull
                    </span>
                  )}
                </button>
              </div>

              {/* Conflict resolution UI */}
              {showConflict && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-xs font-medium text-amber-400">
                    원격 저장소와 충돌이 발생했습니다
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    DB 파일이 로컬과 원격에서 동시에 변경되었습니다. 어떤 버전을 사용할지 선택해주세요.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      onClick={() => handleResolveConflict('ours')}
                      disabled={resolving}
                      className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-primary/40 px-4 text-xs text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                    >
                      {resolving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      내 버전 유지 (원격 변경 무시)
                    </button>
                    <button
                      onClick={() => handleResolveConflict('theirs')}
                      disabled={resolving}
                      className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-amber-500/40 px-4 text-xs text-amber-400 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
                    >
                      {resolving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      원격 버전 사용 (내 변경 덮어쓰기, 앱 재시작)
                    </button>
                  </div>
                </div>
              )}

              <Separator className="bg-border/40" />

              {/* History */}
              <button
                onClick={handleLoadHistory}
                disabled={loadingHistory}
                className="flex h-8 w-fit items-center gap-1.5 rounded-md border border-border px-4 text-xs text-secondary-foreground transition-colors hover:bg-secondary disabled:opacity-50"
              >
                {loadingHistory ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <History className="h-3 w-3" />
                )}
                {showHistory ? '히스토리 닫기' : '변경 히스토리'}
              </button>

              {showHistory && (
                <div className="max-h-60 overflow-y-auto rounded-md border border-border">
                  {commits.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">커밋 기록이 없습니다.</p>
                  ) : (
                    <ul className="divide-y divide-border/40">
                      {commits.map((c) => (
                        <li key={c.hash} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-foreground">{c.message}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(c.date).toLocaleString('ko-KR')} · {c.hash.slice(0, 7)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRestore(c.hash)}
                            disabled={restoring !== null}
                            className="flex h-6 shrink-0 items-center gap-1 rounded border border-border px-2 text-[10px] text-secondary-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                          >
                            {restoring === c.hash ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-2.5 w-2.5" />
                            )}
                            복원
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
