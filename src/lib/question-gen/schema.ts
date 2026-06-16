import { z } from 'zod'

export const genSchema = z
  .object({
    studentId: z.string().cuid(),
    knowledgePointIds: z.array(z.string().cuid()).optional(),
    counts: z.object({
      single: z.number().int().min(0),
      fill: z.number().int().min(0),
      answer: z.number().int().min(0),
    }),
    chartEnabled: z.boolean(),
    chartPercentage: z.number().min(0).max(100).optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    subject: z.string().min(1),
    grade: z.string().min(1),
  })
  .refine((v) => !v.chartEnabled || typeof v.chartPercentage === 'number', {
    message: 'chartPercentage is required when chartEnabled is true',
    path: ['chartPercentage'],
  })