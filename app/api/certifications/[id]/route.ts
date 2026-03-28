import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cert = await prisma.certification.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      flightNumber: true,
      flightDate: true,
      airline: true,
      route: true,
      distanceKm: true,
      delayHours: true,
      claimAmount: true,
      validityScore: true,
      confidence: true,
      status: true,
      blockchainHash: true,
      createdAt: true,
      isPublic: true,
    },
  })

  if (!cert) {
    return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
  }

  if (!cert.isPublic) {
    return NextResponse.json({ error: 'Certification is private' }, { status: 403 })
  }

  return NextResponse.json(cert)
}
