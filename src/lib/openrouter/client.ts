import { getEnv } from '@/lib/env'

type OpenRouterUserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export type OpenRouterMessage =
  | { role: 'system' | 'assistant'; content: string }
  | { role: 'user'; content: string | OpenRouterUserContentPart[] }

type OpenRouterChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: unknown
    }
  }>
}

export async function openRouterChatCompletions(input: {
  model: string
  messages: OpenRouterMessage[]
  temperature?: number
}): Promise<string> {
  const env = getEnv()
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      response_format: { type: 'json_object' },
      ...(typeof input.temperature === 'number' ? { temperature: input.temperature } : null)
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${text}`)
  }

  const json = (await res.json()) as OpenRouterChatCompletionsResponse
  const content = json.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('OpenRouter: missing content')
  return content
}
