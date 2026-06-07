import fs from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import type { StorageProvider } from './types'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads'

export const localStorageProvider: StorageProvider = {
  async save(buffer: Buffer, filename: string, _mimeType: string): Promise<string> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const ext = path.extname(filename)
    const storedName = `${uuidv4()}${ext}`
    const filePath = path.join(UPLOAD_DIR, storedName)
    await fs.writeFile(filePath, buffer)
    return storedName
  },

  getUrl(storedPath: string): string {
    return `/api/uploads/${storedPath}`
  },

  getLocalPath(storedPath: string): string {
    return path.resolve(UPLOAD_DIR, storedPath)
  },
}
