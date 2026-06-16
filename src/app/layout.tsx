import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import '@ant-design/v5-patch-for-react-19'
import './globals.css'
import { SessionProviderWrapper } from '@/components/shared/SessionProviderWrapper'

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AntdRegistry>
          <SessionProviderWrapper>{children}</SessionProviderWrapper>
        </AntdRegistry>
      </body>
    </html>
  )
}
