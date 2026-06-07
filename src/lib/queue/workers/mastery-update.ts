import { Worker } from 'bullmq'
import { getRedisConnection } from '../connection'
import type { MasteryUpdateJobData } from '../queues'
import { prisma } from '@/lib/db'
import { calculateNewMastery, type MasteryEvidence } from '@/lib/mastery/calculator'

export const masteryUpdateWorker = new Worker<MasteryUpdateJobData>(
  'mastery_update',
  async (job) => {
    const { submissionId } = job.data

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        gradingResults: {
          include: { knowledgePoint: true },
          where: { finalScore: { not: null } },
        },
        student: {
          include: {
            masteries: true,
            submissions: {
              include: { gradingResults: { where: { knowledgePointId: { not: null } } } },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
      },
    })

    if (!submission) throw new Error(`Submission ${submissionId} not found`)

    const byKP = submission.gradingResults.reduce<Record<string, typeof submission.gradingResults>>((acc, gr) => {
      if (!gr.knowledgePointId) return acc
      acc[gr.knowledgePointId] = acc[gr.knowledgePointId] ?? []
      acc[gr.knowledgePointId].push(gr)
      return acc
    }, {})

    const existingMasteries = Object.fromEntries(
      submission.student.masteries.map((m) => [m.knowledgePointId, m.masteryScore])
    )

    const historicalErrors = submission.student.submissions
      .flatMap((s) => s.gradingResults)
      .reduce<Record<string, string[]>>((acc, gr) => {
        if (gr.knowledgePointId && gr.errorType) {
          acc[gr.knowledgePointId] = acc[gr.knowledgePointId] ?? []
          acc[gr.knowledgePointId].push(gr.errorType)
        }
        return acc
      }, {})

    for (const [kpId, results] of Object.entries(byKP)) {
      const currentScore = existingMasteries[kpId] ?? null

      const evidences: MasteryEvidence[] = results.map((gr, idx) => {
        const histErrors = historicalErrors[kpId] ?? []
        const isRepeat = gr.errorType ? histErrors.slice(0, -results.length).includes(gr.errorType) : false
        const recencyWeight = 1.0 - (idx * 0.1)

        return {
          questionDifficulty: 'medium',
          scoreRate: gr.finalScore ?? (gr.isCorrect ? 1.0 : 0.0),
          errorType: gr.errorType,
          isRepeatError: isRepeat,
          recencyWeight: Math.max(0.3, recencyWeight),
        }
      })

      const newScore = calculateNewMastery(currentScore, evidences)

      await prisma.studentMastery.upsert({
        where: { studentId_knowledgePointId: { studentId: submission.studentId, knowledgePointId: kpId } },
        create: { studentId: submission.studentId, knowledgePointId: kpId, masteryScore: newScore, evidenceCount: results.length },
        update: { masteryScore: newScore, evidenceCount: { increment: results.length } },
      })
    }

    return { updatedKPs: Object.keys(byKP).length }
  },
  { connection: getRedisConnection(), concurrency: 5 }
)
