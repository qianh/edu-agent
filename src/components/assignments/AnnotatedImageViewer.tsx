'use client'
import { useState } from 'react'
import { Tooltip } from 'antd'

interface BBox {
  x: number; y: number; width: number; height: number
}

interface Mark {
  id: string
  questionNo: string
  markType: string
  markText?: string | null
  bbox: BBox
  confidence: number
}

interface Props {
  imageUrl: string
  marks: Mark[]
  selectedQuestionNo?: string | null
  onMarkClick?: (questionNo: string) => void
}

function getMarkColor(mark: Mark): string {
  if (mark.confidence < 0.70) return '#ff4d4f'
  if (mark.confidence < 0.85) return '#fa8c16'
  if (mark.markType === 'tick') return '#52c41a'
  if (mark.markType === 'cross') return '#ff4d4f'
  if (mark.markType === 'deduct') return '#faad14'
  return '#1677ff'
}

function getMarkLabel(mark: Mark): string {
  const typeLabels: Record<string, string> = {
    tick: '✓', cross: '✗', half: '△', deduct: `−${mark.markText ?? '?'}`,
    score: mark.markText ?? '?', comment: '评', circle: '○',
  }
  return typeLabels[mark.markType] ?? mark.markType
}

export function AnnotatedImageViewer({ imageUrl, marks, selectedQuestionNo, onMarkClick }: Props) {
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null)
  const [zoom, setZoom] = useState(1)

  return (
    <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', maxWidth: '100%' }}>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>−</button>
        <span style={{ fontSize: 12, color: '#666' }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}>+</button>
      </div>

      <div style={{ position: 'relative', display: 'inline-block', transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="作业图片"
          onLoad={(e) => {
            const img = e.currentTarget
            setImgSize({ width: img.naturalWidth, height: img.naturalHeight })
          }}
          style={{ display: 'block', maxWidth: '100%', userSelect: 'none' }}
          draggable={false}
        />

        {imgSize && (
          <svg
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            viewBox={`0 0 ${imgSize.width} ${imgSize.height}`}
          >
            {marks.map((mark) => {
              const x = mark.bbox.x * imgSize.width
              const y = mark.bbox.y * imgSize.height
              const w = mark.bbox.width * imgSize.width
              const h = mark.bbox.height * imgSize.height
              const color = getMarkColor(mark)
              const isSelected = mark.questionNo === selectedQuestionNo
              const isDashed = mark.confidence < 0.70

              return (
                <g
                  key={mark.id}
                  style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                  onClick={() => onMarkClick?.(mark.questionNo)}
                >
                  <rect
                    x={x} y={y} width={w} height={h}
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={isDashed ? '6 3' : undefined}
                    rx={3}
                  />
                  <text
                    x={x + 3} y={y + 14}
                    fill={color}
                    fontSize={14}
                    fontWeight="bold"
                  >
                    {getMarkLabel(mark)}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
      </div>

      <div style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: 11, color: '#666' }}>
        <span><span style={{ color: '#52c41a' }}>■</span> 正确 (≥85%)</span>
        <span><span style={{ color: '#ff4d4f' }}>■</span> 错误 / 低置信</span>
        <span><span style={{ color: '#fa8c16' }}>■</span> 需确认 (70-84%)</span>
      </div>
    </div>
  )
}
