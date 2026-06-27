import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import bcryptjs from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { authorize } from '@/lib/auth'

vi.mock('@/lib/db', () => ({
  prisma: {
    teacher: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

const { prisma } = await import('@/lib/db')

let hashedPassword: string

beforeAll(async () => {
  hashedPassword = await bcryptjs.hash('secret123', 10)
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authorize — 基础校验', () => {
  it('returns null when credentials are missing', async () => {
    const result = await authorize(undefined)
    expect(result).toBeNull()
  })

  it('returns null when emailOrPhone is missing', async () => {
    const result = await authorize({ password: 'secret123' })
    expect(result).toBeNull()
  })

  it('returns null when password is missing', async () => {
    const result = await authorize({ emailOrPhone: 'a@b.com' })
    expect(result).toBeNull()
  })

  it('returns null when input format is invalid (not email and not 11-digit number)', async () => {
    const result = await authorize({ emailOrPhone: 'abc123', password: 'secret123' })
    expect(result).toBeNull()
  })
})

describe('authorize — 邮箱登录（已有账号）', () => {
  it('returns null when password does not match', async () => {
    vi.mocked(prisma.teacher.findUnique).mockResolvedValue({
      id: 'teacher-1',
      email: 'zhang@school.com',
      phone: null,
      password: hashedPassword,
      name: '张老师',
      subject: '数学',
      role: 'teacher',
    } as never)
    const result = await authorize({ emailOrPhone: 'zhang@school.com', password: 'wrongpassword' })
    expect(result).toBeNull()
  })

  it('returns session user when email + correct password', async () => {
    vi.mocked(prisma.teacher.findUnique).mockResolvedValue({
      id: 'teacher-1',
      email: 'zhang@school.com',
      phone: null,
      password: hashedPassword,
      name: '张老师',
      subject: '数学',
      role: 'teacher',
    } as never)
    const result = await authorize({ emailOrPhone: 'zhang@school.com', password: 'secret123' })
    expect(result).toEqual({
      id: 'teacher-1',
      email: 'zhang@school.com',
      name: '张老师',
      subject: '数学',
      role: 'teacher',
    })
  })
})

describe('authorize — 手机号登录（已有账号）', () => {
  it('returns session user when phone + correct password', async () => {
    vi.mocked(prisma.teacher.findUnique).mockResolvedValue({
      id: 'teacher-2',
      email: null,
      phone: '13800138000',
      password: hashedPassword,
      name: '李老师',
      subject: '语文',
      role: 'teacher',
    } as never)
    const result = await authorize({ emailOrPhone: '13800138000', password: 'secret123' })
    expect(result).toEqual({
      id: 'teacher-2',
      email: null,
      name: '李老师',
      subject: '语文',
      role: 'teacher',
    })
  })

  it('returns null when phone + wrong password', async () => {
    vi.mocked(prisma.teacher.findUnique).mockResolvedValue({
      id: 'teacher-2',
      email: null,
      phone: '13800138000',
      password: hashedPassword,
      name: '李老师',
      subject: '语文',
      role: 'teacher',
    } as never)
    const result = await authorize({ emailOrPhone: '13800138000', password: 'wrongpassword' })
    expect(result).toBeNull()
  })
})

describe('authorize — 自动注册（新账号）', () => {
  it('creates account and returns user when new email', async () => {
    vi.mocked(prisma.teacher.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.teacher.create).mockResolvedValue({
      id: 'new-teacher-1',
      email: 'new@example.com',
      phone: null,
      password: 'hashedpw',
      name: 'new',
      subject: '未设置',
      role: 'teacher',
    } as never)

    const result = await authorize({ emailOrPhone: 'new@example.com', password: 'newpass123' })

    expect(prisma.teacher.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          name: 'new',
          subject: '未设置',
          role: 'teacher',
        }),
      })
    )
    expect(result).toEqual({
      id: 'new-teacher-1',
      email: 'new@example.com',
      name: 'new',
      subject: '未设置',
      role: 'teacher',
    })
  })

  it('creates account and returns user when new phone number', async () => {
    vi.mocked(prisma.teacher.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.teacher.create).mockResolvedValue({
      id: 'new-teacher-2',
      email: null,
      phone: '13912345678',
      password: 'hashedpw',
      name: '13912345678',
      subject: '未设置',
      role: 'teacher',
    } as never)

    const result = await authorize({ emailOrPhone: '13912345678', password: 'newpass123' })

    expect(prisma.teacher.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: '13912345678',
          name: '13912345678',
          subject: '未设置',
          role: 'teacher',
        }),
      })
    )
    expect(result).toEqual({
      id: 'new-teacher-2',
      email: null,
      name: '13912345678',
      subject: '未设置',
      role: 'teacher',
    })
  })

  it('recovers from concurrent create race (P2002) by re-fetching and verifying password', async () => {
    const raceTeacher = {
      id: 'race-teacher-1',
      email: null,
      phone: '13800138001',
      password: hashedPassword,
      name: '13800138001',
      subject: '未设置',
      role: 'teacher',
    }

    vi.mocked(prisma.teacher.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(raceTeacher as never)

    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
    })
    vi.mocked(prisma.teacher.create).mockRejectedValue(p2002)

    const result = await authorize({ emailOrPhone: '13800138001', password: 'secret123' })

    expect(prisma.teacher.findUnique).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      id: 'race-teacher-1',
      email: null,
      name: '13800138001',
      subject: '未设置',
      role: 'teacher',
    })
  })

  it('returns null when P2002 race resolves to account with wrong password', async () => {
    vi.mocked(prisma.teacher.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'race-teacher-2',
        email: null,
        phone: '13800138002',
        password: hashedPassword,
        name: '13800138002',
        subject: '未设置',
        role: 'teacher',
      } as never)

    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.22.0',
    })
    vi.mocked(prisma.teacher.create).mockRejectedValue(p2002)

    const result = await authorize({ emailOrPhone: '13800138002', password: 'wrongpassword' })
    expect(result).toBeNull()
  })
})
