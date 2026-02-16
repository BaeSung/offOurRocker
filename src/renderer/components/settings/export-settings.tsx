import { FolderOpen } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useSettingsStore } from "@/stores/useSettingsStore"

export function ExportSettings() {
  const {
    defaultExportFormat,
    exportFrontmatter,
    exportIncludeImages,
    exportFootnoteStyle,
    exportDirectory,
    setSetting,
  } = useSettingsStore()

  // Map internal values to UI radio values
  const formatValue = defaultExportFormat === 'markdown' ? 'md' : defaultExportFormat

  const handleFormatChange = (v: string) => {
    setSetting('defaultExportFormat', v === 'md' ? 'markdown' : v as 'txt' | 'html' | 'epub')
  }

  const handleSelectExportDir = async () => {
    try {
      const dir = await window.api.system.selectDirectory()
      if (dir) {
        setSetting('exportDirectory', dir)
      }
    } catch {
      // directory selection failed
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Default format */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          기본 내보내기 형식
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          작품을 내보낼 때 사용할 기본 형식을 선택합니다.
        </p>
        <div className="mt-4">
          <RadioGroup
            value={formatValue}
            onValueChange={handleFormatChange}
            className="flex flex-col gap-3"
          >
            <label
              className={
                "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all duration-150 " +
                (formatValue === "md"
                  ? "border-primary bg-secondary/50"
                  : "border-border hover:border-muted-foreground/30")
              }
            >
              <RadioGroupItem value="md" id="f-md" />
              <div>
                <span className="text-sm text-foreground">Markdown</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  .md
                </span>
              </div>
            </label>
            <label
              className={
                "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all duration-150 " +
                (formatValue === "txt"
                  ? "border-primary bg-secondary/50"
                  : "border-border hover:border-muted-foreground/30")
              }
            >
              <RadioGroupItem value="txt" id="f-txt" />
              <div>
                <span className="text-sm text-foreground">텍스트</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  .txt
                </span>
              </div>
            </label>
            <label
              className={
                "flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-all duration-150 " +
                (formatValue === "epub"
                  ? "border-primary bg-secondary/50"
                  : "border-border hover:border-muted-foreground/30")
              }
            >
              <RadioGroupItem value="epub" id="f-epub" />
              <div>
                <span className="text-sm text-foreground">EPUB</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  .epub
                </span>
              </div>
            </label>
            <div className="flex items-center gap-3 rounded-lg border-2 border-border p-3 opacity-40">
              <div className="h-4 w-4 rounded-full border border-muted-foreground" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">PDF</span>
                <span className="rounded-full bg-muted-foreground/20 px-2 py-0.5 text-[9px] text-muted-foreground">
                  준비 중
                </span>
              </div>
            </div>
          </RadioGroup>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Markdown options */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          Markdown 옵션
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Markdown으로 내보낼 때의 세부 설정입니다.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-secondary-foreground">
                프론트매터 포함
              </Label>
              <p className="text-[10px] text-muted-foreground">
                제목, 장르, 상태 등 YAML 메타데이터
              </p>
            </div>
            <Switch checked={exportFrontmatter} onCheckedChange={(v) => setSetting('exportFrontmatter', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-secondary-foreground">
                삽화 포함
              </Label>
              <p className="text-[10px] text-muted-foreground">
                이미지 파일 함께 내보내기
              </p>
            </div>
            <Switch
              checked={exportIncludeImages}
              onCheckedChange={(v) => setSetting('exportIncludeImages', v)}
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs text-secondary-foreground">
              각주 스타일
            </Label>
            <RadioGroup
              value={exportFootnoteStyle}
              onValueChange={(v) => setSetting('exportFootnoteStyle', v as 'inline' | 'bottom')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="inline" id="fn-inline" />
                <Label htmlFor="fn-inline" className="text-xs text-foreground">
                  인라인
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="bottom" id="fn-bottom" />
                <Label htmlFor="fn-bottom" className="text-xs text-foreground">
                  하단 참조
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Export location */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          내보내기 위치
        </h3>
        <div className="mt-3">
          <Label className="text-xs text-secondary-foreground">
            기본 내보내기 폴더
          </Label>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 truncate rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
              {exportDirectory || "~/Documents/OffOurRocker/exports"}
            </div>
            <button
              onClick={handleSelectExportDir}
              className="flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-secondary-foreground transition-colors hover:bg-secondary"
            >
              <FolderOpen className="h-3 w-3" />
              변경
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
