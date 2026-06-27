import bcryptjs from 'bcryptjs'
import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

const teacherSelect = {
  id: true,
  email: true,
  name: true,
  password: true,
  subject: true,
  role: true,
} as const

type TeacherAuth = {
  id: string
  email: string | null
  name: string
  password: string
  subject: string
  role: string
}

function detectIdentifier(input: string): { type: 'email' | 'phone' | 'invalid' } {
  if (input.includes('@')) return { type: 'email' }
  if (/^\d{11}$/.test(input)) return { type: 'phone' }
  return { type: 'invalid' }
}

export async function authorize(
  credentials: Record<string, string> | undefined
): Promise<{ id: string; email: string | null; name: string; subject: string; role: string } | null> {
  const input = credentials?.emailOrPhone
  const password = credentials?.password
  if (!input || !password) return null

  const { type } = detectIdentifier(input)
  if (type === 'invalid') return null

  const where = type === 'email' ? { email: input } : { phone: input }

  let teacher = await prisma.teacher.findUnique({ where, select: teacherSelect })

  if (!teacher) {
    const hashed = await bcryptjs.hash(password, 10)
    const name = type === 'email' ? input.split('@')[0] : input
    try {
      teacher = await prisma.teacher.create({
        data: {
          ...(type === 'email' ? { email: input } : { phone: input }),
          name,
          password: hashed,
          subject: '未设置',
          role: 'teacher',
        },
        select: teacherSelect,
      })
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err
      teacher = await prisma.teacher.findUnique({ where, select: teacherSelect })
      if (!teacher) return null
      const valid = await bcryptjs.compare(password, teacher.password)
      if (!valid) return null
    }
  } else {
    const valid = await bcryptjs.compare(password, teacher.password)
    if (!valid) return null
  }

  return toSessionUser(teacher)
}

function toSessionUser(teacher: TeacherAuth) {
  return {
    id: teacher.id,
    email: teacher.email,
    name: teacher.name,
    subject: teacher.subject,
    role: teacher.role,
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        emailOrPhone: { label: '邮箱或手机号', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      authorize,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.subject = (user as { subject: string }).subject
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { subject?: string }).subject = token.subject as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
}

export function requireAuth() {
  return getServerSession(authOptions)
}
