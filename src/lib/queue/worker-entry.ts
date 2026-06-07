import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { imageAnalysisWorker } from './workers/image-analysis'
import { gradingWorker } from './workers/grading'
import { questionGenWorker } from './workers/question-gen'
import { masteryUpdateWorker } from './workers/mastery-update'

console.log('[Worker] Starting all workers...')

const workers = [imageAnalysisWorker, gradingWorker, questionGenWorker, masteryUpdateWorker]

workers.forEach((w) => {
  w.on('completed', (job) => console.log(`[${w.name}] Job ${job.id} completed`))
  w.on('failed', (job, err) => console.error(`[${w.name}] Job ${job?.id} failed:`, err.message))
})

process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM received, shutting down...')
  await Promise.all(workers.map((w) => w.close()))
  process.exit(0)
})
