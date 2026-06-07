import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import './globals.css'

export const metadata: Metadata = {
  title: '教师教学智能体',
  description: '智能教学辅助平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  )
}
