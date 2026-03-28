import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/airlines
 * Returns all airline compliance stats, sorted by compliance score ascending
 * (worst first — this is the "shame database").
 */
export async function GET(_req: NextRequest) {
  const stats = await prisma.airlineStats.findMany({
    orderBy: { complianceScore: 'asc' },
  })

  return NextResponse.json(stats)
}
