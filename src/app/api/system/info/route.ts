import fs from 'fs/promises'
import path from 'path'
import { requireAuth } from '@/lib/auth'
import { providerRegistry } from '@/lib/ai/registry'
import packageJson from '../../../../../package.json'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads'

async function getStorageBytes(): Promise<number> {
  try {
    const files = await fs.readdir(UPLOAD_DIR)
    const sizes = await Promise.all(
      files.map(async (file) => (await fs.stat(path.join(UPLOAD_DIR, file))).size)
    )
    return sizes.reduce((sum, size) => sum + size, 0)
  } catch {
    return 0
  }
}

export async function GET() {
  const session = await requireAuth()
  if (!session) return Response.json({ error: '未登录' }, { status: 401 })

  const storageBytes = await getStorageBytes()

  return Response.json({
    version: packageJson.version,
    aiModels: providerRegistry.getActiveModels(),
    storageBytes,
  })
}