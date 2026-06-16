'use client'
import { Layout, Menu, Breadcrumb, Badge, Avatar, Input, Drawer, Dropdown } from 'antd'
import {
  HomeOutlined, UserOutlined, FileTextOutlined,
  FormOutlined, BarChartOutlined, BookOutlined,
  SettingOutlined, BellOutlined, SearchOutlined,
  RobotOutlined, MessageOutlined, LogoutOutlined,
} from '@ant-design/icons'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { ChatPanel, type ChatMessage } from '@/components/shared/ChatPanel'

const { Sider, Header, Content } = Layout

const MENU_ITEMS = [
  { key: '/', icon: <HomeOutlined />, label: '智能助手首页', href: '/' },
  { key: '/students', icon: <UserOutlined />, label: '学生管理', href: '/students' },
  { key: '/assignments', icon: <FileTextOutlined />, label: '作业管理', href: '/assignments' },
  { key: '/questions', icon: <FormOutlined />, label: '出题管理', href: '/questions/generate' },
  { key: '/class-dashboard', icon: <BarChartOutlined />, label: '班级看板', href: '/class-dashboard' },
  { key: '/knowledge', icon: <BookOutlined />, label: '教学资源', href: '/knowledge/points' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置', href: '/settings' },
]

const BREADCRUMB_MAP: Record<string, string[]> = {
  '/': ['首页'],
  '/students': ['首页', '学生管理'],
  '/assignments': ['首页', '作业管理'],
  '/assignments/upload': ['首页', '作业管理', '上传作业'],
  '/questions/generate': ['首页', '出题管理', '个性化试题生成'],
  '/class-dashboard': ['首页', '班级看板'],
  '/knowledge/points': ['首页', '教学资源'],
  '/settings': ['首页', '系统设置'],
}

const QUICK_REPLIES = [
  '本周待批改作业有哪些？',
  '哪些学生需要重点关注？',
  '帮我分析班级学情',
  '推荐本周练习题',
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'ai', text: '您好！有什么我可以帮您的吗？' },
  ])
  const teacherName: string = session?.user?.name ?? ''
  const avatarChar = teacherName[0] ?? '?'
  const greetingSet = useRef(false)

  if (!greetingSet.current && teacherName) {
    greetingSet.current = true
    setChatHistory([{ role: 'ai', text: `您好，${teacherName}！有什么我可以帮您的吗？` }])
  }

  const avatarMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: () => signOut({ callbackUrl: '/login' }),
      },
    ],
  }

  const selectedKey = MENU_ITEMS.find((m) => m.key !== '/' && pathname.startsWith(m.key))?.key ?? '/'
  const breadcrumbs = BREADCRUMB_MAP[pathname] ?? ['首页', '详情']

  function sendMessage(text: string) {
    if (!text.trim()) return
    setChatHistory(h => [
      ...h,
      { role: 'user', text },
      { role: 'ai', text: '好的，我来帮您分析一下...' },
    ])
    setChatMsg('')
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sider
        width={200}
        style={{
          background: '#fff',
          borderRight: '1px solid #e8e8e8',
          position: 'fixed',
          height: '100vh',
          zIndex: 100,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#1677ff', lineHeight: 1.3 }}>
            教师教学<br />智能体
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            style={{ border: 0, padding: '8px 0' }}
            items={MENU_ITEMS.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: <Link href={item.href}>{item.label}</Link>,
            }))}
          />
        </div>
      </Sider>

      <Layout style={{ marginLeft: 200, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header style={{
          background: '#fff',
          borderBottom: '1px solid #e8e8e8',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          lineHeight: '56px',
          flexShrink: 0,
          zIndex: 99,
        }}>
          <Breadcrumb
            items={breadcrumbs.map((label, i) => ({
              title: i === breadcrumbs.length - 1
                ? <span style={{ color: '#1677ff', fontSize: 13 }}>{label}</span>
                : <span style={{ color: '#666', fontSize: 13 }}>{label}</span>,
            }))}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#bbb' }} />}
              placeholder="搜索..."
              style={{ width: 180, borderRadius: 20, fontSize: 12 }}
              size="small"
            />
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, color: '#666', cursor: 'pointer' }} />
            </Badge>
            <Dropdown menu={avatarMenu} placement="bottomRight">
              <Avatar size={32} style={{ background: '#1677ff', cursor: 'pointer', fontSize: 14 }}>{avatarChar}</Avatar>
            </Dropdown>
          </div>
        </Header>

        <Content style={{
          padding: '20px 24px',
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {children}
        </Content>
      </Layout>

      {/* Floating Chat Button */}
      <div
        onClick={() => setChatOpen(true)}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 32,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
          boxShadow: '0 4px 16px rgba(22,119,255,0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 200,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(22,119,255,0.55)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = ''
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(22,119,255,0.45)'
        }}
      >
        <MessageOutlined style={{ color: '#fff', fontSize: 22 }} />
      </div>

      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>教学助手</div>
              <div style={{ fontSize: 11, color: '#52c41a', fontWeight: 400 }}>● 在线</div>
            </div>
          </div>
        }
        placement="right"
        width={360}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
          header: { borderBottom: '1px solid #f0f0f0', padding: '12px 16px' },
        }}
      >
        <ChatPanel
          messages={chatHistory}
          quickReplies={QUICK_REPLIES}
          value={chatMsg}
          onChange={setChatMsg}
          onSend={sendMessage}
          placeholder="输入问题，按 Enter 发送..."
        />
      </Drawer>
    </Layout>
  )
}
