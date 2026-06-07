'use client'
import { Alert, Progress, Spin } from 'antd'
import { useJobStream } from '@/hooks/useJobStream'

interface Props {
  jobId: string | null
  onDone?: () => void
}

export function JobProgressBar({ jobId, onDone }: Props) {
  const { status, done, error } = useJobStream(jobId)

  if (!jobId) return null

  if (error) {
    return <Alert type="error" message={`处理失败：${error}`} style={{ marginBottom: 16 }} />
  }

  if (done) {
    if (onDone) setTimeout(onDone, 500)
    return <Alert type="success" message="AI 处理完成，正在加载结果..." style={{ marginBottom: 16 }} />
  }

  const statusLabels: Record<string, string> = {
    pending: '等待处理...',
    processing: 'AI 正在分析作业图片...',
  }

  return (
    <div style={{ marginBottom: 16, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae0ff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Spin size="small" />
        <span style={{ color: '#1677ff' }}>{statusLabels[status ?? 'pending']}</span>
      </div>
      <Progress percent={status === 'processing' ? 60 : 20} status="active" showInfo={false} />
    </div>
  )
}
