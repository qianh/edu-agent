'use client'
import { Card, Row, Col, Tag, List, Avatar } from 'antd'
import {
  UserOutlined, FileTextOutlined, FormOutlined,
  BarChartOutlined, RobotOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  BookOutlined, FundOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import useSWR from 'swr'
import { useMemo, useState } from 'react'
import { ChatPanel, type ChatMessage } from '@/components/shared/ChatPanel'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

// Stable hover handlers — extracted to avoid recreating per render
function hoverIn(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = 'translateY(-2px)'
  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
}
function hoverOut(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = ''
  e.currentTarget.style.boxShadow = ''
}

const STAT_CHIPS = [
  { label: '本周作业', key: 'weekly', color: '#1677ff', icon: <FileTextOutlined /> },
  { label: '待批改', key: 'pending', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  { label: '已完成', key: 'done', color: '#52c41a', icon: <CheckCircleOutlined /> },
  { label: '待确认', key: 'confirm', color: '#faad14', icon: <ClockCircleOutlined /> },
]

const INIT_MESSAGES: ChatMessage[] = [
  { role: 'ai', text: '您好，王老师！今天有2份作业待批改，3名学生需要关注。' },
  { role: 'ai', text: '张三的代数知识点掌握度本周下降了8%，建议重点辅导。' },
  { role: 'ai', text: '本周班级平均分为78.6分，较上周提升了2.3分，整体趋势良好。' },
  { role: 'ai', text: '李华的错题集中在"因式分解"模块，建议针对性出题练习。' },
]

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'success', pending_confirm: 'warning',
  processing: 'processing', pending: 'default', failed: 'error',
}
const STATUS_LABELS: Record<string, string> = {
  confirmed: '已完成', pending_confirm: '待确认',
  processing: 'AI处理中', pending: '待上传', failed: '失败',
}

const QUICK_SUGGEST = ['批改进度如何？', '薄弱学生有哪些？', '帮我出5道练习题', '本周学情总结']

const QUICK_ENTRIES = [
  { label: '上传作业', icon: <FileTextOutlined />, href: '/assignments/upload', color: '#1677ff', bg: '#e6f4ff' },
  { label: '智能出题', icon: <FormOutlined />, href: '/questions/generate', color: '#52c41a', bg: '#f6ffed' },
  { label: '学情分析', icon: <BarChartOutlined />, href: '/class-dashboard', color: '#fa8c16', bg: '#fff7e6' },
  { label: '学生管理', icon: <UserOutlined />, href: '/students', color: '#eb2f96', bg: '#fff0f6' },
  { label: '班级看板', icon: <FundOutlined />, href: '/class-dashboard', color: '#722ed1', bg: '#f9f0ff' },
  { label: '教学资源', icon: <BookOutlined />, href: '/knowledge/points', color: '#13c2c2', bg: '#e6fffb' },
]

export default function HomePage() {
  const { data: assignments } = useSWR('/api/assignments', fetcher)
  const [input, setInput] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(INIT_MESSAGES)

  const greeting = useMemo(getGreeting, [])
  const dateStr = useMemo(() => new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }), [])

  const submissions = assignments?.submissions ?? []
  const recentList = submissions.slice(0, 20)

  // Single pass instead of three separate .filter() calls
  const chipValues = submissions.reduce(
    (acc: Record<string, number>, s: { status: string }) => {
      if (s.status === 'pending') acc.pending++
      if (s.status === 'confirmed') acc.done++
      if (s.status === 'pending_confirm') acc.confirm++
      return acc
    },
    { weekly: submissions.length, pending: 0, done: 0, confirm: 0 },
  )

  function sendMsg(text: string) {
    if (!text.trim()) return
    setChatHistory(h => [...h, { role: 'user', text }, { role: 'ai', text: '好的，我来帮您处理...' }])
    setInput('')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Greeting Banner */}
      <Card
        style={{ flexShrink: 0, marginBottom: 12, background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%)', border: 'none' }}
        styles={{ body: { padding: '12px 20px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
              {greeting}，王老师！ 👋
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>{dateStr}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {STAT_CHIPS.map((chip) => (
              <div key={chip.key} style={{
                background: '#fff', borderRadius: 10, padding: '6px 16px',
                textAlign: 'center', minWidth: 68, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ color: chip.color, fontSize: 20, fontWeight: 700 }}>{chipValues[chip.key] ?? 0}</div>
                <div style={{ color: '#999', fontSize: 11, marginTop: 1 }}>{chip.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Row gutter={16} style={{ flex: 1, minHeight: 0 }}>

        {/* Left: Assignments + Quick Entries */}
        <Col span={15} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            title="最近作业"
            extra={<Link href="/assignments" style={{ fontSize: 12 }}>查看全部 →</Link>}
            style={{ flex: 1, minHeight: 0, marginBottom: 12, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, minHeight: 0, padding: 0, overflow: 'auto' } }}
          >
            <List
              size="small"
              dataSource={recentList}
              locale={{ emptyText: '暂无作业，点击上传开始批改' }}
              renderItem={(item: { id: string; assignment?: { title: string; subject: string }; student?: { name: string }; status: string; totalScoreConfirmed: number | null }) => (
                <List.Item style={{ padding: '10px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 10 }}>
                    <Avatar size={32} style={{ background: '#e6f4ff', color: '#1677ff', flexShrink: 0, fontSize: 14 }}>
                      {item.student?.name?.[0] ?? '?'}
                    </Avatar>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Link href={`/assignments/${item.id}/grading`} style={{ color: '#333' }}>
                          {item.assignment?.title ?? '—'}
                        </Link>
                      </div>
                      <div style={{ fontSize: 11, color: '#999' }}>
                        {item.student?.name ?? '—'} · {item.assignment?.subject ?? '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {item.totalScoreConfirmed !== null && (
                        <span style={{ fontWeight: 700, color: '#1677ff', fontSize: 14 }}>{item.totalScoreConfirmed}分</span>
                      )}
                      <Tag color={STATUS_COLORS[item.status] ?? 'default'} style={{ fontSize: 11, margin: 0 }}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </Card>

          <Card style={{ flexShrink: 0 }} styles={{ body: { padding: '10px 14px' } }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {QUICK_ENTRIES.map((entry) => (
                <Link key={entry.href + entry.label} href={entry.href} style={{ flex: 1 }}>
                  <div
                    style={{ background: entry.bg, borderRadius: 10, padding: '12px 6px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={hoverIn}
                    onMouseLeave={hoverOut}
                  >
                    <div style={{ fontSize: 20, color: entry.color, marginBottom: 4 }}>{entry.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: '#333' }}>{entry.label}</div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </Col>

        {/* Right: AI Assistant */}
        <Col span={9} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>教学助手</div>
                  <div style={{ fontSize: 11, color: '#52c41a', fontWeight: 400 }}>● 在线</div>
                </div>
              </div>
            }
            style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
            styles={{ body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 } }}
          >
            <ChatPanel
              messages={chatHistory}
              quickReplies={QUICK_SUGGEST}
              value={input}
              onChange={setInput}
              onSend={sendMsg}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
