import { describe, it, expect } from 'vitest'
import { providerRegistry } from '@/lib/ai/registry'

describe('providerRegistry', () => {
  it('returns glm5v for analyzeImage by default', () => {
    const provider = providerRegistry.getImageProvider()
    expect(provider.name).toBe('glm5v')
  })

  it('returns deepseek for generateText by default', () => {
    const provider = providerRegistry.getTextProvider()
    expect(provider.name).toBe('deepseek')
  })

  it('switches text provider when configured', () => {
    providerRegistry.setTextProvider('glm5v')
    expect(providerRegistry.getTextProvider().name).toBe('glm5v')
    providerRegistry.setTextProvider('deepseek')
  })
})
