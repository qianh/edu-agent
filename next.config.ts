import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['bullmq', '@prisma/client'],
}

export default nextConfig
