import type { GeometrySpec } from '@/lib/question-gen/chart-spec'

const SIZE = 220

export function GeometrySvg({ spec }: { spec: GeometrySpec }) {
  if (spec.shape === 'triangle' || spec.shape === 'quadrilateral') {
    if (!spec.points?.length) return null
    const pointsAttr = spec.points.map((p) => `${p.x * 20 + 20},${SIZE - p.y * 20 - 20}`).join(' ')
    return (
      <svg width={SIZE} height={SIZE} style={{ background: '#fff', border: '1px solid #eee' }}>
        <polygon points={pointsAttr} fill="none" stroke="#1677ff" strokeWidth={2} />
        {spec.points.map((p, i) => (
          <text key={i} x={p.x * 20 + 24} y={SIZE - p.y * 20 - 24} fontSize={12} fill="#333">
            {p.label ?? ''}
          </text>
        ))}
      </svg>
    )
  }

  if (spec.shape === 'circle') {
    const r = (spec.radius ?? 5) * 20
    return (
      <svg width={SIZE} height={SIZE} style={{ background: '#fff', border: '1px solid #eee' }}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="#1677ff" strokeWidth={2} />
      </svg>
    )
  }

  if (spec.shape === 'number-line') {
    return (
      <svg width={SIZE} height={60} style={{ background: '#fff', border: '1px solid #eee' }}>
        <line x1={10} y1={30} x2={SIZE - 10} y2={30} stroke="#333" strokeWidth={2} />
        {(spec.labels ?? []).map((label, i) => (
          <text key={i} x={20 + i * 40} y={50} fontSize={12} fill="#333">{label}</text>
        ))}
      </svg>
    )
  }

  return <div style={{ fontSize: 12, color: '#999' }}>暂不支持渲染该几何类型：{spec.shape}</div>
}