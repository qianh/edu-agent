import OpenAI from 'openai'
import type { NamedAIProvider, AIOptions, ImageAnalysisResult } from './types'

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    timeout: 30_000,
  })
}

export const deepseekProvider: NamedAIProvider = {
  name: 'deepseek',

  async analyzeImage(_imageUrl: string, _prompt: string): Promise<ImageAnalysisResult> {
    throw new Error('DeepSeek does not support image analysis. Use GLM-5V.')
  },

  async generateText(prompt: string, opts?: AIOptions): Promise<string> {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts?.maxTokens ?? 4096,
      temperature: opts?.temperature ?? 0.3,
    })
    return response.choices[0]?.message?.content ?? ''
  },

  async generateEmbedding(text: string): Promise<number[]> {
    const { glm5vProvider } = await import('./glm5v')
    return glm5vProvider.generateEmbedding(text)
  },
}
