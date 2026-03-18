import { BrowserWindow } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { storeApiKey, getApiKey, deleteApiKey } from '../utils/crypto'
import { safeHandle } from './utils'
import type { SpellCorrection } from '../../shared/types'

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

/* ── Helpers ── */

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0 }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${body}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Unexpected OpenAI response format')
  return content
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0,
      system: messages.find((m) => m.role === 'system')?.content,
      messages: messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content })),
    }),
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

async function callLLM(
  provider: 'openai' | 'anthropic',
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  if (provider === 'openai') {
    return callOpenAI(apiKey, model, messages)
  } else {
    return callAnthropic(apiKey, model, messages)
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

  safeHandle(
    IPC.AI_TEST_CONNECTION,
    async (_e, provider: 'openai' | 'anthropic', keyName: string) => {
      const apiKey = getApiKey(keyName)
      if (!apiKey) return { success: false, error: 'API key not found' }

      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return { success: true }
      } else {
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
      }
    }
  )

  safeHandle(
    IPC.AI_SPELL_CHECK,
    async (
      _e,
      text: string,
      provider: 'openai' | 'anthropic',
      model: string,
      keyName: string
    ): Promise<SpellCheckResult> => {
      const apiKey = getApiKey(keyName)
      if (!apiKey) return { success: false, error: 'API key not found' }

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

        const result = await callLLM(provider, apiKey, model, systemPrompt, chunks[i])

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
    IPC.AI_GENERATE_IMAGE,
    async (
      _e,
      prompt: string,
      keyName: string,
      options?: { size?: string; quality?: string; style?: string }
    ): Promise<ImageGenerateResult> => {
      const apiKey = getApiKey(keyName)
      if (!apiKey) return { success: false, error: 'API key not found' }

      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: options?.size || '1024x1024',
          quality: options?.quality || 'standard',
          style: options?.style || 'natural',
          response_format: 'b64_json',
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`DALL-E API error ${res.status}: ${body}`)
      }

      const data = await res.json()
      const b64 = data?.data?.[0]?.b64_json
      if (!b64) throw new Error('Unexpected DALL-E response format')
      return { success: true, b64 }
    }
  )
}
