import { Tag, Tooltip } from 'antd'

interface Props {
  confidence: number
  size?: 'small' | 'default'
}

export function ConfidenceBadge({ confidence, size = 'default' }: Props) {
  const pct = Math.round(confidence * 100)
  const color = confidence >= 0.85 ? 'success' : confidence >= 0.70 ? 'warning' : 'error'
  const label = confidence >= 0.85 ? `${pct}%` : confidence >= 0.70 ? `${pct}% 建议确认` : `${pct}% 需复核`

  return (
    <Tooltip title={`识别置信度：${pct}%`}>
      <Tag color={color} style={{ fontSize: size === 'small' ? 10 : 12 }}>{label}</Tag>
    </Tooltip>
  )
}
