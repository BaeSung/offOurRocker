import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-channels'
import { storeApiKey, getApiKey, deleteApiKey } from '../utils/crypto'

/* ── Types ── */

interface SpellCorrection {
  original: string
  corrected: string
  explanation: string
}

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
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
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
  // Store encrypted API key
  ipcMain.handle(IPC.AI_STORE_KEY, async (_e, keyName: string, plainKey: string) => {
    try {
      storeApiKey(keyName, plainKey)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Get decrypted API key (returns masked version for display)
  ipcMain.handle(IPC.AI_GET_KEY, async (_e, keyName: string) => {
    try {
      const key = getApiKey(keyName)
      if (!key) return { exists: false, masked: '' }
      // Return masked version: show first 7 and last 4 chars
      const masked =
        key.length > 12
          ? key.slice(0, 7) + '•'.repeat(Math.min(key.length - 11, 20)) + key.slice(-4)
          : '•'.repeat(key.length)
      return { exists: true, masked }
    } catch (err: any) {
      return { exists: false, masked: '', error: err.message }
    }
  })

  // Delete API key
  ipcMain.handle(IPC.AI_DELETE_KEY, async (_e, keyName: string) => {
    try {
      deleteApiKey(keyName)
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // Test connection
  ipcMain.handle(
    IPC.AI_TEST_CONNECTION,
    async (_e, provider: 'openai' | 'anthropic', keyName: string) => {
      try {
        const apiKey = getApiKey(keyName)
        if (!apiKey) return { success: false, error: 'API key not found' }

        if (provider === 'openai') {
          const res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` },
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return { success: true }
        } else {
          // Anthropic: send a minimal message to verify the key
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
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  // Spell check
  ipcMain.handle(
    IPC.AI_SPELL_CHECK,
    async (
      _e,
      text: string,
      provider: 'openai' | 'anthropic',
      model: string,
      keyName: string
    ): Promise<SpellCheckResult> => {
      try {
        const apiKey = getApiKey(keyName)
        if (!apiKey) return { success: false, error: 'API key not found' }

        const systemPrompt = `당신은 한국어 맞춤법 교정 전문가입니다.
사용자가 보낸 텍스트에서 맞춤법, 띄어쓰기, 문법 오류를 찾아 교정하세요.
반드시 아래 JSON 배열 형식으로만 응답하세요. 오류가 없으면 빈 배열 []을 반환하세요.
[{"original":"틀린 부분","corrected":"교정된 부분","explanation":"교정 이유"}]`

        const result = await callLLM(provider, apiKey, model, systemPrompt, text)

        // Extract JSON array from response (handle code fences, extra text)
        let jsonStr = result.trim()
        // Remove markdown code fences
        jsonStr = jsonStr.replace(/```(?:json)?\s*/g, '').replace(/```/g, '')
        // Extract the JSON array portion
        const arrMatch = jsonStr.match(/\[[\s\S]*\]/)
        if (!arrMatch) {
          return { success: true, corrections: [] }
        }

        const corrections: SpellCorrection[] = JSON.parse(arrMatch[0])
        return { success: true, corrections }
      } catch (err: any) {
        console.error('[AI] Spell check error:', err)
        return { success: false, error: err.message }
      }
    }
  )

  // Image generation (DALL-E)
  ipcMain.handle(
    IPC.AI_GENERATE_IMAGE,
    async (
      _e,
      prompt: string,
      keyName: string,
      options?: { size?: string; quality?: string; style?: string }
    ): Promise<ImageGenerateResult> => {
      try {
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
      } catch (err: any) {
        console.error('[AI] Image generation error:', err)
        return { success: false, error: err.message }
      }
    }
  )
}
