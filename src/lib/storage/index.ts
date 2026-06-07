import { localStorageProvider } from './local'
import type { StorageProvider } from './types'

export function getStorageProvider(): StorageProvider {
  const type = process.env.STORAGE_TYPE ?? 'local'
  switch (type) {
    case 'local':
      return localStorageProvider
    default:
      throw new Error(`Unsupported STORAGE_TYPE: ${type}`)
  }
}

export { type StorageProvider }
