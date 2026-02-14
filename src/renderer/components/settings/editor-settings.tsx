import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
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

const bodyFontMap: Record<string, string> = {
  "Noto Sans KR": "'Noto Sans KR', sans-serif",
  Pretendard: "Pretendard, sans-serif",
  "Nanum Gothic": "'Nanum Gothic', sans-serif",
  "KoPubWorld돋움": "'KoPubWorldDotum', sans-serif",
  "Noto Serif KR": "'Noto Serif KR', serif",
}

function FontPreview({
  fontFamily,
  fontSize,
  lineHeight,
}: {
  fontFamily: string
  fontSize: number
  lineHeight: number
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/40 p-4">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        미리보기
      </p>
      <div
        style={{ fontFamily, fontSize: `${fontSize}px`, lineHeight }}
        className="text-foreground"
      >
        밤바다는 낮의 바다와는 전혀 다른 생물이었다. 민수는 갯바위 끝에 서서 검은
        수평선을 바라보았다.
      </div>
    </div>
  )
}

export function EditorSettings() {
  const {
    fontFamily,
    titleFontFamily,
    fontSize,
    lineHeight,
    indent,
    indentSize,
    spellUnderline,
    lineHighlight,
    autoQuotes,
    autoEllipsis,
    charCountMode,
    manuscriptBase,
    focusDarkness,
    editorWidth,
    typingSound,
    soundType,
    setSetting,
  } = useSettingsStore()

  return (
    <div className="flex flex-col gap-8">
      {/* Font */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">폰트</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          에디터에서 사용할 글꼴을 설정합니다.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="w-1/2">
              <Label className="text-xs text-secondary-foreground">
                본문 폰트
              </Label>
              <Select value={fontFamily} onValueChange={(v) => setSetting('fontFamily', v)}>
                <SelectTrigger className="mt-1.5 h-9 bg-secondary/60 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Noto Sans KR">Noto Sans KR</SelectItem>
                  <SelectItem value="Noto Serif KR">Noto Serif KR</SelectItem>
                  <SelectItem value="Pretendard">Pretendard</SelectItem>
                  <SelectItem value="Nanum Gothic">나눔고딕</SelectItem>
                  <SelectItem value="KoPubWorld돋움">
                    KoPubWorld돋움
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-1/2">
              <Label className="text-xs text-secondary-foreground">
                제목 폰트
              </Label>
              <Select value={titleFontFamily} onValueChange={(v) => setSetting('titleFontFamily', v)}>
                <SelectTrigger className="mt-1.5 h-9 bg-secondary/60 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Noto Serif KR">Noto Serif KR</SelectItem>
                  <SelectItem value="KoPubWorld바탕">
                    KoPubWorld바탕
                  </SelectItem>
                  <SelectItem value="Nanum Myeongjo">나눔명조</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Font size */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-secondary-foreground">
                폰트 크기
              </Label>
              <span className="text-xs font-medium text-primary">
                {fontSize}px
              </span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={([v]) => setSetting('fontSize', v)}
              min={12}
              max={24}
              step={1}
              className="mt-2"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>12px</span>
              <span>24px</span>
            </div>
          </div>

          {/* Line height */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-secondary-foreground">
                줄 간격
              </Label>
              <span className="text-xs font-medium text-primary">
                {lineHeight.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[lineHeight]}
              onValueChange={([v]) => setSetting('lineHeight', v)}
              min={1.4}
              max={2.4}
              step={0.1}
              className="mt-2"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>1.4</span>
              <span>2.4</span>
            </div>
          </div>

          {/* Preview */}
          <FontPreview
            fontFamily={bodyFontMap[fontFamily] || "'Noto Sans KR', sans-serif"}
            fontSize={fontSize}
            lineHeight={lineHeight}
          />
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Editing */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">편집</h3>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-secondary-foreground">
                문단 첫 줄 들여쓰기
              </Label>
              {indent && (
                <div className="mt-1.5 flex gap-2">
                  <button
                    onClick={() => setSetting('indentSize', '1em')}
                    className={
                      "rounded-md px-2.5 py-1 text-[11px] transition-colors " +
                      (indentSize === "1em"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80")
                    }
                  >
                    1em
                  </button>
                  <button
                    onClick={() => setSetting('indentSize', '2em')}
                    className={
                      "rounded-md px-2.5 py-1 text-[11px] transition-colors " +
                      (indentSize === "2em"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80")
                    }
                  >
                    2em
                  </button>
                </div>
              )}
            </div>
            <Switch checked={indent} onCheckedChange={(v) => setSetting('indent', v)} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-secondary-foreground">
              맞춤법 밑줄 표시
            </Label>
            <Switch
              checked={spellUnderline}
              onCheckedChange={(v) => setSetting('spellUnderline', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-secondary-foreground">
              현재 줄 하이라이트
            </Label>
            <Switch
              checked={lineHighlight}
              onCheckedChange={(v) => setSetting('lineHighlight', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-secondary-foreground">
                {"자동 따옴표 변환"}
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {'"" → 「」'}
              </p>
            </div>
            <Switch checked={autoQuotes} onCheckedChange={(v) => setSetting('autoQuotes', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-secondary-foreground">
                자동 말줄임표
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {"... → \u2026"}
              </p>
            </div>
            <Switch
              checked={autoEllipsis}
              onCheckedChange={(v) => setSetting('autoEllipsis', v)}
            />
          </div>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Character count */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">
          글자수 카운트
        </h3>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <Label className="mb-2 block text-xs text-secondary-foreground">
              기본 카운트
            </Label>
            <RadioGroup
              value={charCountMode}
              onValueChange={(v) => setSetting('charCountMode', v as 'include' | 'exclude')}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="include" id="cc-include" />
                <Label htmlFor="cc-include" className="text-xs text-foreground">
                  공백 포함
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="exclude" id="cc-exclude" />
                <Label htmlFor="cc-exclude" className="text-xs text-foreground">
                  공백 미포함
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div>
            <Label className="mb-2 block text-xs text-secondary-foreground">
              원고지 기준
            </Label>
            <RadioGroup
              value={String(manuscriptBase)}
              onValueChange={(v) => setSetting('manuscriptBase', Number(v))}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="200" id="ms-200" />
                <Label htmlFor="ms-200" className="text-xs text-foreground">
                  200자
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="400" id="ms-400" />
                <Label htmlFor="ms-400" className="text-xs text-foreground">
                  400자
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </section>

      <Separator className="bg-border/60" />

      {/* Focus mode */}
      <section>
        <h3 className="text-sm font-semibold text-foreground">집중 모드</h3>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-secondary-foreground">
                배경 어둡기
              </Label>
              <span className="text-xs font-medium text-primary">
                {focusDarkness}%
              </span>
            </div>
            <Slider
              value={[focusDarkness]}
              onValueChange={([v]) => setSetting('focusDarkness', v)}
              min={50}
              max={100}
              step={5}
              className="mt-2"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-secondary-foreground">
                본문 너비
              </Label>
              <span className="text-xs font-medium text-primary">
                {editorWidth}px
              </span>
            </div>
            <Slider
              value={[editorWidth]}
              onValueChange={([v]) => setSetting('editorWidth', v)}
              min={560}
              max={780}
              step={20}
              className="mt-2"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs text-secondary-foreground">
                타이핑 효과음
              </Label>
              {typingSound && (
                <div className="mt-1.5 w-32">
                  <Select value={soundType} onValueChange={(v) => setSetting('soundType', v)}>
                    <SelectTrigger className="h-7 bg-secondary/60 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="typewriter">타자기</SelectItem>
                      <SelectItem value="keyboard">키보드</SelectItem>
                      <SelectItem value="none">없음</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Switch checked={typingSound} onCheckedChange={(v) => setSetting('typingSound', v)} />
          </div>
        </div>
      </section>
    </div>
  )
}
