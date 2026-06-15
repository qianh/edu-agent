'use client'
import { Avatar } from 'antd'
import { RobotOutlined, SendOutlined } from '@ant-design/icons'

export interface ChatMessage { role: 'ai' | 'user'; text: string }

interface Props {
  messages: ChatMessage[]
  quickReplies: string[]
  value: string
  onChange: (v: string) => void
  onSend: (text: string) => void
  placeholder?: string
}

export function ChatPanel({ messages, quickReplies, value, onChange, onSend, placeholder = '向助手提问，按 Enter 发送...' }: Props) {
  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            marginBottom: 12,
          }}>
            {msg.role === 'ai' && (
              <Avatar size={26} style={{ background: '#1677ff', flexShrink: 0, marginRight: 8, marginTop: 2 }}>
                <RobotOutlined style={{ fontSize: 12 }} />
              </Avatar>
            )}
            <div style={{
              maxWidth: '80%',
              padding: '8px 12px',
              borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
              background: msg.role === 'user' ? '#1677ff' : '#f0f9ff',
              color: msg.role === 'user' ? '#fff' : '#333',
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #f5f5f5', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quickReplies.map((r) => (
            <div
              key={r}
              onClick={() => onSend(r)}
              style={{
                fontSize: 11, color: '#1677ff', background: '#e6f4ff',
                borderRadius: 12, padding: '3px 10px', cursor: 'pointer',
                border: '1px solid #bae0ff',
              }}
            >
              {r}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, flexShrink: 0 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSend(value) }}
          placeholder={placeholder}
          style={{
            flex: 1, border: '1px solid #e8e8e8', borderRadius: 20,
            padding: '8px 14px', fontSize: 13, outline: 'none', background: '#fafafa',
          }}
        />
        <button
          onClick={() => onSend(value)}
          style={{
            width: 36, height: 36, background: '#1677ff', border: 'none',
            borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SendOutlined style={{ color: '#fff', fontSize: 14 }} />
        </button>
      </div>
    </>
  )
}
