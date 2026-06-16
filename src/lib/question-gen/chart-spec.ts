import { z } from 'zod'

const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
})

const geometrySpecSchema = z.object({
  kind: z.literal('geometry'),
  shape: z.enum(['triangle', 'quadrilateral', 'circle', 'coordinate', 'number-line']),
  points: z.array(pointSchema).optional(),
  radius: z.number().optional(),
  labels: z.array(z.string()).optional(),
})

const dataChartSpecSchema = z.object({
  kind: z.literal('data'),
  chartType: z.enum(['bar', 'line', 'pie']),
  xKey: z.string(),
  yKeys: z.array(z.string()).min(1),
  data: z.array(z.record(z.string(), z.union([z.number(), z.string()]))),
})

export const chartSpecSchema = z.discriminatedUnion('kind', [geometrySpecSchema, dataChartSpecSchema])

export type ChartSpec = z.infer<typeof chartSpecSchema>
export type GeometrySpec = z.infer<typeof geometrySpecSchema>
export type DataChartSpec = z.infer<typeof dataChartSpecSchema>

export const GEOMETRY_SHAPES = geometrySpecSchema.shape.shape.options