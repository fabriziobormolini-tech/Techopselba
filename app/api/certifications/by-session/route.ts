import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * Look up a certification by Stripe session ID.
 * Used on the success page after payment.
 */
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
  }

  const cert = await prisma.certification.findUnique({
    where: { stripeSessionId: sessionId },
    select: {
      id: true,
      flightNumber: true,
      flightDate: true,
      airline: true,
      route: true,
      claimAmount: true,
      validityScore: true,
      confidence: true,
      status: true,
      blockchainHash: true,
      createdAt: true,
    },
  })

  if (!cert) {
    return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
  }

  return NextResponse.json(cert)
}
