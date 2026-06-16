import { PrismaClient } from '@prisma/client'
import bcryptjs from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const teachers = await prisma.teacher.findMany({ select: { id: true, email: true, password: true } })
  console.log(`Found ${teachers.length} teacher(s)`)

  let migrated = 0
  let skipped = 0

  for (const teacher of teachers) {
    // bcryptjs hashes always start with $2b$ (or $2a$)
    if (teacher.password.startsWith('$2')) {
      console.log(`[skip] ${teacher.email} — already hashed`)
      skipped++
      continue
    }
    const hashed = await bcryptjs.hash(teacher.password, 10)
    await prisma.teacher.update({ where: { id: teacher.id }, data: { password: hashed } })
    console.log(`[done] ${teacher.email} — migrated`)
    migrated++
  }

  console.log(`\nComplete: ${migrated} migrated, ${skipped} skipped`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
