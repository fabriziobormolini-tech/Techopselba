import { NextRequest, NextResponse } from 'next/server'
import { createCertification } from '@/lib/certification'
import { assessClaim } from '@/lib/rules-engine'
import type { FlightData } from '@/types'

/**
 * POST /api/certify
 * Direct certification endpoint (for admin/manual review use).
 * For public users, payment happens first via /api/checkout → Stripe webhook.
 */
export async function POST(req: NextRequest) {
  // Require internal API key for direct certification
  const authHeader = req.headers.get('authorization')
  const apiKey = process.env.INTERNAL_API_KEY
  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { passengerEmail, flightData }: { passengerEmail: string; flightData: FlightData } = body

  if (!passengerEmail || !flightData) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { cert, assessment } = await createCertification({
    passengerEmail,
    flightData,
    documents: {},
  })

  return NextResponse.json({
    certificationId: cert.id,
    status: cert.status,
    amount: cert.claimAmount,
    validityScore: cert.validityScore,
    confidence: cert.confidence,
    blockchainHash: cert.blockchainHash,
    assessment,
  })
}

/**
 * GET /api/certify?flight=FR1234&date=2025-03-15&delay=4&distance=1434
 * Quick eligibility check (no payment, no record created).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const flightNumber = searchParams.get('flight') ?? ''
  const flightDate = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const delayHours = parseFloat(searchParams.get('delay') ?? '0')
  const distanceKm = parseInt(searchParams.get('distance') ?? '0', 10)
  const airline = searchParams.get('airline') ?? flightNumber.substring(0, 2)
  const delayReason = searchParams.get('reason') ?? undefined

  const flightData: FlightData = {
    flightNumber,
    flightDate,
    airline,
    origin: '',
    destination: '',
    route: '',
    distanceKm,
    delayHours,
    delayReason,
  }

  const assessment = assessClaim(flightData)

  return NextResponse.json({
    eligible: assessment.eligible,
    amount: assessment.amount,
    confidence: assessment.confidence,
    validityScore: assessment.validityScore,
    status: assessment.status,
    reasons: assessment.reasons,
    flags: assessment.flags,
  })
}
