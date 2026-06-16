'use client'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts'
import { chartSpecSchema } from '@/lib/question-gen/chart-spec'
import { GeometrySvg } from './GeometrySvg'

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1']

export function ChartQuestionView({
  chartSpec,
  chartImagePrompt,
}: {
  chartSpec: unknown
  chartImagePrompt: string | null
}) {
  if (chartImagePrompt) {
    return (
      <div style={{ marginTop: 8, padding: 8, background: '#fff7e6', border: '1px dashed #faad14', fontSize: 12 }}>
        <strong>图片生成提示词（待人工配图）：</strong>{chartImagePrompt}
      </div>
    )
  }

  const parsed = chartSpecSchema.safeParse(chartSpec)
  if (!parsed.success) {
    return <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>图表数据缺失或格式不正确</div>
  }
  const spec = parsed.data

  if (spec.kind === 'geometry') {
    return <div style={{ marginTop: 8 }}><GeometrySvg spec={spec} /></div>
  }

  return (
    <div style={{ marginTop: 8 }}>
      {spec.chartType === 'bar' && (
        <BarChart width={300} height={200} data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.xKey} />
          <YAxis />
          <Tooltip />
          {spec.yKeys.map((key, i) => <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />)}
        </BarChart>
      )}
      {spec.chartType === 'line' && (
        <LineChart width={300} height={200} data={spec.data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.xKey} />
          <YAxis />
          <Tooltip />
          {spec.yKeys.map((key, i) => <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} />)}
        </LineChart>
      )}
      {spec.chartType === 'pie' && (
        <PieChart width={300} height={200}>
          <Pie data={spec.data} dataKey={spec.yKeys[0]} nameKey={spec.xKey} cx="50%" cy="50%" outerRadius={80} label>
            {spec.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      )}
    </div>
  )
}