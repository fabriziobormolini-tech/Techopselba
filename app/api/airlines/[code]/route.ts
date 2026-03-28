import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/airlines/:code
 * Public compliance data for a single airline — usable by journalists/B2B API.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code.toUpperCase()

  const stats = await prisma.airlineStats.findUnique({
    where: { airlineCode: code },
  })

  if (!stats) {
    return NextResponse.json({ error: 'Airline not found' }, { status: 404 })
  }

  return NextResponse.json({
    airline: stats.airlineCode,
    airline_name: stats.airlineName,
    total_certifications: stats.totalCertifications,
    valid_claims: stats.validClaims,
    paid_claims: stats.paidClaims,
    partial_payments: stats.partialPayments,
    denied_claims: stats.deniedClaims,
    compliance_rate: stats.validClaims > 0
      ? parseFloat((stats.paidClaims / stats.validClaims).toFixed(2))
      : null,
    average_payment_days: stats.avgPaymentDays,
    compliance_score: stats.complianceScore,
    last_updated: stats.lastUpdated.toISOString(),
  })
}
