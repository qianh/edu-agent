'use client'
import { Tooltip } from 'antd'

interface MasteryItem {
  knowledgePoint: { name: string; chapter?: string | null }
  masteryScore: number
}

interface Props {
  masteries: MasteryItem[]
}

function getColor(score: number): string {
  if (score >= 90) return '#52c41a'
  if (score >= 75) return '#73d13d'
  if (score >= 60) return '#faad14'
  if (score > 0)   return '#ff4d4f'
  return '#f0f0f0'
}

function getLabel(score: number): string {
  if (score >= 90) return '熟练掌握'
  if (score >= 75) return '较好掌握'
  if (score >= 60) return '基本掌握'
  if (score > 0)   return '薄弱'
  return '暂无数据'
}

export function MasteryHeatmap({ masteries }: Props) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {masteries.map((m, i) => (
        <Tooltip key={i} title={`${m.knowledgePoint.name}：${getLabel(m.masteryScore)}（${Math.round(m.masteryScore)}分）`}>
          <div style={{
            width: 32, height: 32, borderRadius: 4,
            background: getColor(m.masteryScore),
            cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.08)',
          }} />
        </Tooltip>
      ))}
    </div>
  )
}
