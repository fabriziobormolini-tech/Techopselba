import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PaymentOutcome } from '@prisma/client'

/**
 * POST /api/feedback
 * Passenger reports the outcome of their certified claim.
 * This feeds the airline compliance dashboard.
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { certificationId, outcome, daysToPay, notes } = body

  if (!certificationId || !outcome) {
    return NextResponse.json(
      { error: 'certificationId and outcome are required' },
      { status: 400 }
    )
  }

  const validOutcomes = Object.values(PaymentOutcome)
  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json(
      { error: `outcome must be one of: ${validOutcomes.join(', ')}` },
      { status: 400 }
    )
  }

  const cert = await prisma.certification.findUnique({
    where: { id: certificationId },
  })

  if (!cert) {
    return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
  }

  const feedback = await prisma.passengerFeedback.create({
    data: {
      certificationId,
      outcome,
      daysToPay: daysToPay ?? null,
      notes: notes ?? null,
    },
  })

  // Update airline compliance stats
  await updateAirlineCompliance(cert.airline, outcome, daysToPay)

  return NextResponse.json({ id: feedback.id, recorded: true })
}

async function updateAirlineCompliance(
  airlineCode: string,
  outcome: PaymentOutcome,
  daysToPay?: number
) {
  const update: Record<string, unknown> = { lastUpdated: new Date() }

  if (outcome === PaymentOutcome.PAID_FULL) {
    update.paidClaims = { increment: 1 }
  } else if (outcome === PaymentOutcome.PAID_PARTIAL) {
    update.paidClaims = { increment: 1 }
    update.partialPayments = { increment: 1 }
  } else if (outcome === PaymentOutcome.DENIED || outcome === PaymentOutcome.NO_RESPONSE) {
    update.deniedClaims = { increment: 1 }
  }

  await prisma.airlineStats.updateMany({
    where: { airlineCode },
    data: update as Parameters<typeof prisma.airlineStats.updateMany>[0]['data'],
  })

  // Recalculate compliance score
  const stats = await prisma.airlineStats.findUnique({ where: { airlineCode } })
  if (stats && stats.validClaims > 0) {
    const score = Math.round((stats.paidClaims / stats.validClaims) * 100)
    await prisma.airlineStats.update({
      where: { airlineCode },
      data: { complianceScore: score },
    })
  }
}
