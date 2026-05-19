import { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { storeApiKey, getApiKey, deleteApiKey } from '../utils/crypto'
import { safeHandle } from './utils'
import type { SpellCorrection, BetaReadReport, BetaReadEvidence } from '../../shared/types'
import { MAX_AI_INPUT_CHARS } from '../../shared/types'

function overLimitError(label: string, actual: number): string {
  return `${label}이(가) ${MAX_AI_INPUT_CHARS.toLocaleString()}자를 초과했습니다 (${actual.toLocaleString()}자). 범위를 줄여 다시 시도하세요.`
}

/* ── Types ── */

interface SpellCheckResult {
  success: boolean
  corrections?: SpellCorrection[]
  error?: string
}

interface ImageGenerateResult {
  success: boolean
  url?: string
  b64?: string
  error?: string
}

interface BetaReadResult {
  success: boolean
  report?: BetaReadReport
  error?: string
}

interface LLMCallOptions {
  maxTokens?: number
  temperature?: number
}

/* ── Helpers ── */

async function callLLM(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  options: LLMCallOptions = {}
): Promise<string> {
  const supportsTemperature = !/^claude-opus-4-7/.test(model)
  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens ?? 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  }
  if (supportsTemperature) {
    body.temperature = options.temperature ?? 0
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const text = data?.content?.[0]?.text
  if (!text) throw new Error('Unexpected Anthropic response format')
  return text
}

function extractJsonObject(raw: string): unknown {
  let s = raw.trim()
  s = s.replace(/```(?:json)?\s*/g, '').replace(/```/g, '')
  const match = s.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('응답에서 JSON 객체를 찾을 수 없습니다.')
  return JSON.parse(match[0])
}

function normalizeBetaReadReport(raw: unknown): BetaReadReport {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  const asEvidenceArray = (v: unknown): BetaReadEvidence[] => {
    if (!Array.isArray(v)) return []
    const out: BetaReadEvidence[] = []
    for (const item of v) {
      if (!item || typeof item !== 'object') continue
      const r = item as Record<string, unknown>
      const point = typeof r.point === 'string' ? r.point : null
      if (!point) continue
      const evidence = typeof r.evidence === 'string' ? r.evidence : undefined
      out.push(evidence === undefined ? { point } : { point, evidence })
    }
    return out
  }

  return {
    overall: typeof o.overall === 'string' ? o.overall : '',
    structure: asEvidenceArray(o.structure),
    characters: asEvidenceArray(o.characters),
    prose: asEvidenceArray(o.prose),
    pacing: asStringArray(o.pacing),
    strengths: asStringArray(o.strengths),
    questions: asStringArray(o.questions),
  }
}

/* ── Handlers ── */

export function registerAiHandlers(): void {
  safeHandle(IPC.AI_STORE_KEY, async (_e, keyName: string, plainKey: string) => {
    storeApiKey(keyName, plainKey)
    return { success: true }
  })

  safeHandle(IPC.AI_GET_KEY, async (_e, keyName: string) => {
    const key = getApiKey(keyName)
    if (!key) return { exists: false, masked: '' }
    const masked =
      key.length > 12
        ? key.slice(0, 7) + '•'.repeat(Math.min(key.length - 11, 20)) + key.slice(-4)
        : '•'.repeat(key.length)
    return { exists: true, masked }
  })

  safeHandle(IPC.AI_DELETE_KEY, async (_e, keyName: string) => {
    deleteApiKey(keyName)
    return { success: true }
  })

  safeHandle(IPC.AI_TEST_CONNECTION, async (_e, keyName: string) => {
    const apiKey = getApiKey(keyName)
    if (!apiKey) return { success: false, error: 'API key not found' }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { success: true }
  })

  safeHandle(
    IPC.AI_SPELL_CHECK,
    async (
      _e,
      text: string,
      model: string,
      keyName: string
    ): Promise<SpellCheckResult> => {
      const apiKey = getApiKey(keyName)
      if (!apiKey) return { success: false, error: 'API key not found' }
      if (text.length > MAX_AI_INPUT_CHARS) {
        return { success: false, error: overLimitError('원고', text.length) }
      }

      const systemPrompt = `당신은 한국어 맞춤법·문법 교정 전문가입니다. 국립국어원 표준어 규정과 한글 맞춤법 통일안을 기준으로 꼼꼼하게 검사하세요.

## 반드시 검사할 항목
1. **띄어쓰기**: 조사 붙여쓰기, 의존명사 띄어쓰기, 합성어 띄어쓰기 등
2. **맞춤법**: 된/됀, 돼/되, 데/대, 로서/로써, 이/히 부사 구분, 사이시옷, 겹받침
3. **조사 오용**: 은/는, 이/가, 을/를, 에/에서, 로/으로
4. **어미 활용**: 불규칙 활용 오류 (ㅂ/ㅎ/ㄷ/ㅅ/르 불규칙 등)
5. **피동/사동 이중 표현**: "잡혀지다", "보여지다" 등
6. **높임법 불일치**
7. **자주 틀리는 표현**: 왠지/웬지, 안돼/안되, 됬/됐, 몇일/며칠, 어떻해/어떡해, 오랫만/오랜만, 금새/금세, 일일히/일일이, 깨끗히/깨끗이 등
8. **중복·군더더기 표현**: "역전앞", "처음 첫", "약 ~정도" 등

## 규칙
- 소설·창작 문체(의도적 구어체, 방언, 의성어·의태어, 캐릭터 대사)는 오류로 지적하지 마세요.
- 하지만 서술부(지문)의 오류는 반드시 지적하세요.
- original에는 오류가 포함된 최소 단위(어절 1~3개)만 포함하세요.
- 반드시 아래 JSON 배열 형식으로만 응답하세요. 오류가 없으면 빈 배열 []을 반환하세요.
- **사소한 오류도 놓치지 마세요.** 누락하는 것보다 지적하는 것이 낫습니다.

## 출력 형식
[{"original":"틀린 부분","corrected":"교정된 부분","explanation":"간결한 교정 이유"}]

## 예시
입력: "그는 빛이 바랬다고 말했다."
출력: [{"original":"바랬다고","corrected":"바랐다고","explanation":"'바라다'의 과거형은 '바랐다'입니다 (ㅎ 불규칙 아님)"}]

입력: "한참동안 아무말 없이 걸었다."
출력: [{"original":"한참동안","corrected":"한참 동안","explanation":"의존명사 '동안'은 띄어 씁니다"},{"original":"아무말","corrected":"아무 말","explanation":"관형사 '아무'와 명사 '말'은 띄어 씁니다"}]

입력: "나는 학교에 갔다."
출력: []`

      // Split text into chunks of ~2000 chars at sentence boundaries
      const CHUNK_SIZE = 2000
      const chunks: string[] = []
      let remaining = text
      while (remaining.length > 0) {
        if (remaining.length <= CHUNK_SIZE) {
          chunks.push(remaining)
          break
        }
        // Find the last sentence-ending punctuation within the chunk size
        let splitIdx = -1
        for (let i = CHUNK_SIZE; i >= CHUNK_SIZE * 0.6; i--) {
          if ('.!?。\n'.includes(remaining[i])) {
            splitIdx = i + 1
            break
          }
        }
        if (splitIdx === -1) {
          // Fallback: split at last space
          splitIdx = remaining.lastIndexOf(' ', CHUNK_SIZE)
          if (splitIdx === -1) splitIdx = CHUNK_SIZE
        }
        chunks.push(remaining.slice(0, splitIdx))
        remaining = remaining.slice(splitIdx).trimStart()
      }

      const allCorrections: SpellCorrection[] = []
      const win = BrowserWindow.getFocusedWindow()

      for (let i = 0; i < chunks.length; i++) {
        // Send progress to renderer
        win?.webContents.send(IPC.AI_SPELL_CHECK_PROGRESS, {
          current: i + 1,
          total: chunks.length,
        })

        const result = await callLLM(apiKey, model, systemPrompt, chunks[i])

        let jsonStr = result.trim()
        jsonStr = jsonStr.replace(/```(?:json)?\s*/g, '').replace(/```/g, '')
        const arrMatch = jsonStr.match(/\[[\s\S]*\]/)
        if (arrMatch) {
          try {
            const parsed: SpellCorrection[] = JSON.parse(arrMatch[0])
            allCorrections.push(...parsed)
          } catch {
            // skip malformed chunk result
          }
        }
      }

      return { success: true, corrections: allCorrections }
    }
  )

  safeHandle(
    IPC.AI_SPACING_CHECK,
    async (
      _e,
      text: string,
      model: string,
      keyName: string
    ): Promise<{ success: boolean; corrected?: string; error?: string }> => {
      const apiKey = getApiKey(keyName)
      if (!apiKey) return { success: false, error: 'API key not found' }
      if (text.length > MAX_AI_INPUT_CHARS) {
        return { success: false, error: overLimitError('문단', text.length) }
      }

      if (!text || text.trim().length < 2) {
        return { success: true, corrected: text }
      }

      const systemPrompt = `당신은 한국어 띄어쓰기 전용 교정기입니다. 입력 텍스트의 띄어쓰기만 국립국어원 규정에 맞게 교정합니다.

## 절대 규칙
- 오직 스페이스(공백) 문자만 추가·삭제하세요.
- 글자(한글·한자·영문·숫자), 구두점, 특수문자, 줄바꿈은 절대 추가·삭제·변경하지 마세요.
- 맞춤법·오타도 고치지 마세요. 의도적 구어체·방언·의성어·의태어도 그대로 두세요.
- 공백을 모두 제거한 결과가 원본의 공백을 모두 제거한 것과 한 글자도 다르지 않아야 합니다.

## 출력 형식
- 결과를 반드시 <output>...</output> 태그로 감싸 출력하세요.
- 태그 안에는 교정된 본문만 넣으세요 (설명·접두사·따옴표·코드펜스 금지).
- 변경할 부분이 없으면 원본을 그대로 태그에 넣어 출력하세요.

## 예시
입력: 한참동안 가만히 앉아있었다.
응답: <output>한참 동안 가만히 앉아 있었다.</output>

입력: 그는 교실밖으로 나가버렸다.
응답: <output>그는 교실 밖으로 나가 버렸다.</output>

입력: 나는 학교에 갔다.
응답: <output>나는 학교에 갔다.</output>`

      const raw = await callLLM(apiKey, model, systemPrompt, text, {
        maxTokens: Math.max(256, Math.ceil(text.length * 1.5) + 64),
        temperature: 0,
      })

      let corrected = raw.trim()
      // Extract from <output>...</output> if present
      const tagMatch = corrected.match(/<output>([\s\S]*?)<\/output>/i)
      if (tagMatch) {
        corrected = tagMatch[1]
      }
      // Strip code fences
      corrected = corrected.replace(/^```(?:text)?\s*/i, '').replace(/```\s*$/i, '')
      // Strip common artifact prefixes ("출력:", "결과:", "교정:" 등)
      corrected = corrected.replace(
        /^(출력|결과|교정(?:\s*결과)?|수정|답|응답)\s*[:：]\s*/i,
        ''
      )
      corrected = corrected.trim()
      // Only strip surrounding quotes if the original didn't have them
      const trimmedOrig = text.trim()
      const wrappedInDouble =
        corrected.startsWith('"') &&
        corrected.endsWith('"') &&
        !(trimmedOrig.startsWith('"') && trimmedOrig.endsWith('"'))
      const wrappedInSingle =
        corrected.startsWith("'") &&
        corrected.endsWith("'") &&
        !(trimmedOrig.startsWith("'") && trimmedOrig.endsWith("'"))
      if (wrappedInDouble || wrappedInSingle) {
        corrected = corrected.slice(1, -1)
      }

      const stripWs = (s: string): string => s.replace(/\s+/g, '')
      const origNoWs = stripWs(text)
      const corrNoWs = stripWs(corrected)

      // 핵심: 원본 글자를 그대로 사용하고 LLM의 공백 결정만 채택한다.
      // Unicode 정규화 차이, 보이지 않는 문자(ZWJ 등), 사소한 LLM 오타까지 흡수.
      const overlay = (corr: string, origChars: string[]): string => {
        let idx = 0
        let out = ''
        for (const c of corr) {
          if (/\s/.test(c)) {
            out += c
          } else {
            if (idx >= origChars.length) return ''
            out += origChars[idx++]
          }
        }
        if (idx !== origChars.length) return ''
        return out
      }
      const origChars = [...text].filter((c) => !/\s/.test(c))

      if (origNoWs === corrNoWs) {
        const rebuilt = overlay(corrected, origChars)
        return { success: true, corrected: rebuilt || corrected }
      }

      // Lenient: 글자 수가 같으면 LLM의 공백 패턴을 채택하되 원본 글자로 재구성
      if (origNoWs.length === corrNoWs.length) {
        const rebuilt = overlay(corrected, origChars)
        if (rebuilt) return { success: true, corrected: rebuilt }
      }

      return {
        success: false,
        error: `LLM 응답이 글자 수를 변경했습니다 (${origNoWs.length}→${corrNoWs.length}). 폐기됩니다.`,
      }
    }
  )

  safeHandle(
    IPC.AI_BETA_READ,
    async (
      _e,
      text: string,
      model: string,
      keyName: string,
      context?: { workTitle?: string; chapterTitle?: string; genre?: string }
    ): Promise<BetaReadResult> => {
      const apiKey = getApiKey(keyName)
      if (!apiKey) return { success: false, error: 'API key not found' }
      if (text.length > MAX_AI_INPUT_CHARS) {
        return { success: false, error: overLimitError('원고', text.length) }
      }

      const systemPrompt = `당신은 한국 문학에 정통한 베테랑 베타리더입니다. 작가의 원고를 정독한 뒤 구체적이고 건설적인 피드백을 JSON으로 반환합니다.

## 평가 축
1. 구조·플롯: 갈등 설정, 긴장의 축적, 복선, 장면의 인과, 결말의 타당성
2. 캐릭터: 동기의 일관성, 입체감, 대사의 개성, 인물 간 관계의 역학
3. 문체: 문장의 리듬, 어휘 선택, 시점·화법, 묘사의 밀도
4. 페이싱: 장면별 정보 밀도, 독자 피로도, 빠르거나 느린 구간
5. 강점: 원고가 특히 잘 해낸 지점
6. 질문: 의도인지 실수인지 불분명한 지점 — 작가에게 묻고 싶은 것

## 태도
- 추상적 평가 금지. "캐릭터가 평면적" 대신 "3문단 민지의 반응이 앞에서 쌓아둔 신중한 성격과 어긋난다"처럼 쓰세요.
- 가능하면 원고에서 직접 짧게 인용하세요 (evidence 필드).
- 상업성·흥행 예측은 배제. 작품의 완성도에만 집중.
- 막연한 격려(더 감정을 담으세요, 더 생생하게 등)는 쓰지 마세요. 관찰과 구체적 지적만.
- 작가에게 도움이 되는 방향으로 솔직하게. 문제점을 덮지 마세요.

## 응답 규칙
- 반드시 아래 JSON 구조 하나만 출력. 설명·머리말·코드 펜스·마크다운 금지.
- 각 배열은 관찰할 게 있으면 3~7개, 없으면 빈 배열 [].
- evidence는 선택 항목이지만 가능하면 꼭 포함하세요.

## 출력 스키마
{
  "overall": "한 문단 분량의 전반 인상과 핵심 지점 1~2가지 요약",
  "structure": [{"point":"지적 요지","evidence":"짧은 인용 또는 위치"}],
  "characters": [{"point":"인물명을 포함한 지적","evidence":"근거"}],
  "prose": [{"point":"문체 관찰","evidence":"짧은 인용"}],
  "pacing": ["페이싱 관찰 한 문장", "..."],
  "strengths": ["잘한 지점 한 문장", "..."],
  "questions": ["작가에게 묻고 싶은 것 한 문장", "..."]
}`

      const contextHeader = [
        context?.workTitle ? `작품: ${context.workTitle}` : null,
        context?.chapterTitle ? `회차: ${context.chapterTitle}` : null,
        context?.genre ? `장르: ${context.genre}` : null,
      ]
        .filter(Boolean)
        .join('\n')

      const userPrompt = `${contextHeader ? `${contextHeader}\n\n---\n\n` : ''}다음 원고를 위 기준으로 읽고 JSON으로 피드백하세요.\n\n${text}`

      try {
        const raw = await callLLM(apiKey, model, systemPrompt, userPrompt, {
          maxTokens: 8192,
          temperature: 0.4,
        })
        const parsed = extractJsonObject(raw)
        const report = normalizeBetaReadReport(parsed)
        return { success: true, report }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        return { success: false, error: message }
      }
    }
  )

  safeHandle(
    IPC.AI_GENERATE_IMAGE,
    async (
      _e,
      prompt: string,
      keyName: string,
      options?: { size?: string }
    ): Promise<ImageGenerateResult> => {
      const apiKey = getApiKey(keyName)
      if (!apiKey) return { success: false, error: 'API key not found' }

      const aspectRatio =
        options?.size === '1792x1024'
          ? '16:9'
          : options?.size === '1024x1792'
            ? '9:16'
            : '1:1'
      const promptWithAspect = `${prompt}\n\nAspect ratio: ${aspectRatio}.`

      const model = 'gemini-2.5-flash-image'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptWithAspect }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Gemini image API error ${res.status}: ${body}`)
      }

      const data = await res.json()
      const parts = data?.candidates?.[0]?.content?.parts ?? []
      const imagePart = parts.find(
        (p: { inlineData?: { data?: string } }) => p?.inlineData?.data
      )
      const b64 = imagePart?.inlineData?.data
      if (!b64) throw new Error('Gemini 응답에 이미지가 없습니다.')
      return { success: true, b64 }
    }
  )
}
