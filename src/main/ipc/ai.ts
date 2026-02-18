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
  return data.choices[0].message.content
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
  return data.content[0].text
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

      const systemPrompt = `당신은 한국어 맞춤법·문법 교정 전문가입니다. 국립국어원 표준어 규정과 한글 맞춤법 통일안을 기준으로 검사하세요.

## 규칙
1. **확실한 오류만** 지적하세요. 애매하거나 문체 선택에 해당하는 것은 건너뛰세요.
2. 소설·창작 문체(의도적 구어체, 방언, 의성어·의태어, 캐릭터 말투)는 오류로 지적하지 마세요.
3. 교정 대상: 맞춤법 오류, 띄어쓰기 오류, 조사 오용, 피동/사동 접사 오류, 높임법 불일치.
4. original에는 오류가 포함된 최소 단위(어절 1~3개)만 포함하세요.
5. 반드시 아래 JSON 배열 형식으로만 응답하세요. 오류가 없으면 빈 배열 []을 반환하세요.

## 출력 형식
[{"original":"틀린 부분","corrected":"교정된 부분","explanation":"간결한 교정 이유"}]

## 예시
입력: "그는 빛이 바랬다고 말했다."
출력: [{"original":"바랬다고","corrected":"바랐다고","explanation":"'바라다'의 과거형은 '바랐다'입니다 (ㅎ 불규칙 아님)"}]

입력: "나는 학교에 갔다."
출력: []`

      const result = await callLLM(provider, apiKey, model, systemPrompt, text)

      let jsonStr = result.trim()
      jsonStr = jsonStr.replace(/```(?:json)?\s*/g, '').replace(/```/g, '')
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/)
      if (!arrMatch) {
        return { success: true, corrections: [] }
      }

      const corrections: SpellCorrection[] = JSON.parse(arrMatch[0])
      return { success: true, corrections }
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
          response_format: 'url',
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`DALL-E API error ${res.status}: ${body}`)
      }

      const data = await res.json()
      return { success: true, url: data.data[0].url }
    }
  )
}
