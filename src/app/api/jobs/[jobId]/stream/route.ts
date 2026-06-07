import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let attempts = 0
      const maxAttempts = 120

      const poll = async () => {
        if (attempts++ >= maxAttempts) {
          send({ type: 'timeout', message: '处理超时，请刷新页面查看结果' })
          controller.close()
          return
        }

        const job = await prisma.aIJob.findUnique({ where: { id: jobId } })
        if (!job) {
          send({ type: 'error', message: '任务不存在' })
          controller.close()
          return
        }

        send({ type: 'progress', status: job.status, attempts: job.attempts })

        if (job.status === 'completed' || job.status === 'failed') {
          send({ type: job.status === 'completed' ? 'done' : 'error', message: job.error ?? undefined })
          controller.close()
          return
        }

        setTimeout(poll, 1000)
      }

      await poll()

      req.signal.addEventListener('abort', () => controller.close())
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
