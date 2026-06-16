import OpenAI from 'openai'
import type { NamedAIProvider, AIOptions, ImageAnalysisResult } from './types'

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GLM_API_KEY!,
    baseURL: process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4',
    timeout: 60_000,
  })
}

export const glm5vProvider: NamedAIProvider = {
  name: 'glm5v',
  model: 'glm-5v-turbo',

  async analyzeImage(imageUrl: string, prompt: string, opts?: AIOptions): Promise<ImageAnalysisResult> {
    const client = getClient()

    let imageContent: OpenAI.Chat.ChatCompletionContentPartImage
    if (imageUrl.startsWith('http')) {
      imageContent = { type: 'image_url', image_url: { url: imageUrl } }
    } else {
      const fs = await import('fs/promises')
      const path = await import('path')
      const filePath = imageUrl.startsWith('/') ? imageUrl : path.join(process.cwd(), imageUrl)
      const buffer = await fs.readFile(filePath)
      const base64 = buffer.toString('base64')
      const ext = path.extname(filePath).slice(1).toLowerCase()
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
      imageContent = { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
    }

    const response = await client.chat.completions.create({
      model: 'glm-5v-turbo',
      messages: [
        {
          role: 'user',
          content: [imageContent, { type: 'text', text: prompt }],
        },
      ],
      max_tokens: opts?.maxTokens ?? 4096,
      temperature: opts?.temperature ?? 0.1,
    })

    const content = response.choices[0]?.message?.content ?? '{}'
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ?? content.match(/(\{[\s\S]*\})/)
    const jsonStr = jsonMatch?.[1] ?? content
    return JSON.parse(jsonStr) as ImageAnalysisResult
  },

  async generateText(prompt: string, opts?: AIOptions): Promise<string> {
    const client = getClient()
    const response = await client.chat.completions.create({
      model: 'glm-4.7',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts?.maxTokens ?? 2048,
      temperature: opts?.temperature ?? 0.3,
    })
    return response.choices[0]?.message?.content ?? ''
  },

  async generateEmbedding(text: string): Promise<number[]> {
    const client = getClient()
    const response = await client.embeddings.create({
      model: 'embedding-3',
      input: text,
    })
    return response.data[0].embedding
  },
}
