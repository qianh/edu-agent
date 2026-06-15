import { prisma } from '@/lib/db'

export async function GET() {
  const classes = await prisma.class.findMany({
    select: { id: true, name: true, grade: true, subject: true },
    orderBy: [{ grade: 'asc' }, { name: 'asc' }],
  })
  return Response.json(classes)
}
