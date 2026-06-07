'use client'
import { Table, Tag, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const statusColors: Record<string, string> = {
  pending: 'default', processing: 'processing',
  pending_confirm: 'warning', confirmed: 'success', failed: 'error',
}
const statusLabels: Record<string, string> = {
  pending: '待处理', processing: 'AI处理中',
  pending_confirm: '待确认', confirmed: '已确认', failed: '失败',
}

export default function AssignmentsPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR('/api/assignments', fetcher)
  const submissions = data?.submissions ?? []

  const columns = [
    { title: '作业名称', dataIndex: ['assignment', 'title'], key: 'title' },
    { title: '学生', dataIndex: ['student', 'name'], key: 'student' },
    { title: '科目', dataIndex: ['assignment', 'subject'], key: 'subject' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) =>
      <Tag color={statusColors[v] ?? 'default'}>{statusLabels[v] ?? v}</Tag>
    },
    { title: '得分', dataIndex: 'totalScoreConfirmed', key: 'score', render: (v: number | null) => v ?? '-' },
    { title: '时间', dataIndex: 'createdAt', key: 'time', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
    { title: '操作', key: 'action', render: (_: unknown, r: { id: string; status: string }) => (
      <Space>
        <Button size="small" onClick={() => router.push(`/assignments/${r.id}/grading`)}>查看批改</Button>
      </Space>
    )},
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>作业管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/assignments/upload')}>上传作业</Button>
      </div>
      <Table dataSource={submissions} columns={columns} rowKey="id" loading={isLoading} />
    </div>
  )
}
