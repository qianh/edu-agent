'use client'
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

interface RadarData {
  subject: string
  score: number
  fullMark: number
}

interface Props {
  data: RadarData[]
}

export function RadarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsRadar cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
        <Radar name="掌握度" dataKey="score" stroke="#1677ff" fill="#1677ff" fillOpacity={0.3} />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}
