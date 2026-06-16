import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashed = await bcryptjs.hash('test123', 10)
  const teacher = await prisma.teacher.create({
    data: {
      name: '测试教师',
      email: 'test@school.com',
      password: hashed,
      subject: '数学',
      role: 'teacher',
    },
  })
  console.log('Created:', teacher.email, teacher.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
