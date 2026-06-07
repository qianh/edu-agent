'use client'
import { Card, Row, Col, Tag, List, Avatar, Badge } from 'antd'
import {
  UserOutlined, FileTextOutlined, FormOutlined,
  BarChartOutlined, RobotOutlined, SendOutlined,
  ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  BookOutlined, FundOutlined, SettingOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

const STAT_CHIPS = [
  { label: '本周作业', key: 'weekly', color: '#1677ff', icon: <FileTextOutlined /> },
  { label: '待批改', key: 'pending', color: '#ff4d4f', icon: <ExclamationCircleOutlined /> },
  { label: '已完成', key: 'done', color: '#52c41a', icon: <CheckCircleOutlined /> },
  { label: '待确认', key: 'confirm', color: '#faad14', icon: <ClockCircleOutlined /> },
]

const AI_MESSAGES = [
  { text: '您好，王老师！今天有2份作业待批改，3名学生需要关注。' },
  { text: '张三的代数知识点掌握度本周下降了8%，建议重点辅导。' },
  { text: '本周班级平均分为78.6分，较上周提升了2.3分，整体趋势良好。' },
]

const QUICK_ENTRIES = [
  { label: '上传作业', icon: <FileTextOutlined />, href: '/assignments/upload', color: '#e6f4ff', iconColor: '#1677ff' },
  { label: '智能出题', icon: <FormOutlined />, href: '/questions/generate', color: '#f6ffed', iconColor: '#52c41a' },
  { label: '学情分析', icon: <BarChartOutlined />, href: '/class-dashboard', color: '#fff7e6', iconColor: '#fa8c16' },
  { label: '学生管理', icon: <UserOutlined />, href: '/students', color: '#fff0f6', iconColor: '#eb2f96' },
]

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'success', pending_confirm: 'warning',
  processing: 'processing', pending: 'default', failed: 'error',
}
const STATUS_LABELS: Record<string, string> = {
  confirmed: '已完成', pending_confirm: '待确认',
  processing: 'AI处理中', pending: '待上传', failed: '失败',
}

export default function HomePage() {
  const { data: assignments } = useSWR('/api/assignments', fetcher)
  const [input, setInput] = useState('')
  const submissions = assignments?.submissions ?? []
  const recentList = submissions.slice(0, 6)

  const chipValues: Record<string, number> = {
    weekly: submissions.length,
    pending: submissions.filter((s: { status: string }) => s.status === 'pending').length,
    done: submissions.filter((s: { status: string }) => s.status === 'confirmed').length,
    confirm: submissions.filter((s: { status: string }) => s.status === 'pending_confirm').length,
  }

  return (
    <div>
      {/* Greeting Banner */}
      <Card
        style={{ marginBottom: 16, background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f9ff 100%)', border: 'none' }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              {getGreeting()}，王老师！ 👋
            </div>
            <div style={{ color: '#666', fontSize: 13 }}>
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {STAT_CHIPS.map((chip) => (
              <div key={chip.key} style={{
                background: '#fff', borderRadius: 10, padding: '8px 16px',
                textAlign: 'center', minWidth: 72, boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ color: chip.color, fontSize: 22, fontWeight: 700 }}>{chipValues[chip.key] ?? 0}</div>
                <div style={{ color: '#999', fontSize: 11, marginTop: 2 }}>{chip.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Row gutter={16}>
        {/* Left: AI Assistant Panel */}
        <Col span={7}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={24} style={{ background: '#1677ff' }}>
                  <RobotOutlined style={{ fontSize: 12 }} />
                </Avatar>
                <span style={{ fontSize: 13 }}>教学助手</span>
                <Badge status="success" />
              </div>
            }
            style={{ height: 420 }}
            bodyStyle={{ padding: 12, display: 'flex', flexDirection: 'column', height: 360 }}
          >
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 8 }}>
              {AI_MESSAGES.map((msg, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Avatar size={24} style={{ background: '#1677ff', flexShrink: 0 }}>
                      <RobotOutlined style={{ fontSize: 12 }} />
                    </Avatar>
                    <div style={{
                      background: '#f0f9ff', borderRadius: '0 8px 8px 8px',
                      padding: '8px 10px', fontSize: 12, color: '#333', maxWidth: '85%',
                      lineHeight: 1.6,
                    }}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="向助手提问..."
                style={{
                  flex: 1, border: '1px solid #e8e8e8', borderRadius: 16,
                  padding: '6px 12px', fontSize: 12, outline: 'none',
                }}
              />
              <button style={{
                background: '#1677ff', border: 'none', borderRadius: 16,
                padding: '0 12px', cursor: 'pointer', color: '#fff', fontSize: 12,
              }} onClick={() => setInput('')}>
                <SendOutlined />
              </button>
            </div>
          </Card>
        </Col>

        {/* Center: Recent Assignments */}
        <Col span={11}>
          <Card
            title="最近作业"
            extra={<Link href="/assignments" style={{ fontSize: 12 }}>查看全部 →</Link>}
            style={{ height: 420 }}
            bodyStyle={{ padding: 0, height: 360, overflowY: 'auto' }}
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
        </Col>

        {/* Right: Quick Entries */}
        <Col span={6}>
          <Card title="快捷入口" style={{ height: 420 }} bodyStyle={{ padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {QUICK_ENTRIES.map((entry) => (
                <Link key={entry.href} href={entry.href}>
                  <div style={{
                    background: entry.color, borderRadius: 10,
                    padding: '18px 8px', textAlign: 'center',
                    cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = ''
                  }}
                  >
                    <div style={{ fontSize: 24, color: entry.iconColor, marginBottom: 6 }}>{entry.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>{entry.label}</div>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/assignments/upload">
              <div style={{
                background: '#1677ff', borderRadius: 8, padding: '8px',
                textAlign: 'center', color: '#fff', fontSize: 13,
                fontWeight: 500, cursor: 'pointer',
              }}>
                + 上传新作业
              </div>
            </Link>
          </Card>
        </Col>
      </Row>

      {/* Bottom Quick Entries — 6 icon buttons */}
      <Card
        title="快捷入口"
        style={{ marginTop: 16 }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
          {[
            { label: '上传作业', icon: <FileTextOutlined />, href: '/assignments/upload', color: '#1677ff', bg: '#e6f4ff' },
            { label: '智能出题', icon: <FormOutlined />, href: '/questions/generate', color: '#52c41a', bg: '#f6ffed' },
            { label: '学情分析', icon: <BarChartOutlined />, href: '/class-dashboard', color: '#fa8c16', bg: '#fff7e6' },
            { label: '学生管理', icon: <UserOutlined />, href: '/students', color: '#eb2f96', bg: '#fff0f6' },
            { label: '班级看板', icon: <FundOutlined />, href: '/class-dashboard', color: '#722ed1', bg: '#f9f0ff' },
            { label: '教学资源', icon: <BookOutlined />, href: '/knowledge', color: '#13c2c2', bg: '#e6fffb' },
          ].map((entry) => (
            <Link key={entry.href + entry.label} href={entry.href} style={{ flex: 1 }}>
              <div style={{
                background: entry.bg, borderRadius: 10,
                padding: '14px 8px', textAlign: 'center', cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
              >
                <div style={{ fontSize: 22, color: entry.color, marginBottom: 6 }}>{entry.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#333' }}>{entry.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
