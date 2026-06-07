import { glm5vProvider } from './glm5v'
import { deepseekProvider } from './deepseek'
import type { NamedAIProvider } from './types'

const providers: Record<string, NamedAIProvider> = {
  glm5v: glm5vProvider,
  deepseek: deepseekProvider,
}

class ProviderRegistry {
  private imageProviderName = 'glm5v'
  private textProviderName = 'deepseek'

  getImageProvider(): NamedAIProvider {
    return providers[this.imageProviderName]
  }

  getTextProvider(): NamedAIProvider {
    return providers[this.textProviderName]
  }

  setImageProvider(name: string): void {
    if (!providers[name]) throw new Error(`Unknown provider: ${name}`)
    this.imageProviderName = name
  }

  setTextProvider(name: string): void {
    if (!providers[name]) throw new Error(`Unknown provider: ${name}`)
    this.textProviderName = name
  }
}

export const providerRegistry = new ProviderRegistry()
