import { Queue } from 'bullmq'
import { getRedisConnection } from './connection'

export type JobType = 'image_analysis' | 'grading' | 'question_gen' | 'mastery_update'

export interface ImageAnalysisJobData {
  submissionId: string
  mode: 'ai_grade' | 'teacher_mark' | 'ai_review'
}

export interface GradingJobData {
  submissionId: string
  knowledgePointIds: string[]
}

export interface QuestionGenJobData {
  studentId?: string
  knowledgePointIds: string[]
  type: string
  difficulty: string
  count: number
  subject: string
  grade: string
}

export interface MasteryUpdateJobData {
  submissionId: string
}

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
}

function makeQueue<T>(name: JobType) {
  let instance: Queue<T> | null = null
  return {
    get(): Queue<T> {
      if (!instance) {
        instance = new Queue<T>(name, {
          connection: getRedisConnection(),
          defaultJobOptions,
        })
      }
      return instance
    },
    add(...args: Parameters<Queue<T>['add']>) {
      return this.get().add(...args)
    },
  }
}

export const imageAnalysisQueue = makeQueue<ImageAnalysisJobData>('image_analysis')
export const gradingQueue = makeQueue<GradingJobData>('grading')
export const questionGenQueue = makeQueue<QuestionGenJobData>('question_gen')
export const masteryUpdateQueue = makeQueue<MasteryUpdateJobData>('mastery_update')
