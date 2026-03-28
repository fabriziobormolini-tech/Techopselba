import { NextRequest, NextResponse } from 'next/server'
import { createCheckoutSession } from '@/lib/stripe'
import { assessClaim } from '@/lib/rules-engine'
import type { FlightData } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      passengerEmail,
      flightData,
    }: { passengerEmail: string; flightData: FlightData } = body

    if (!passengerEmail || !flightData?.flightNumber) {
      return NextResponse.json(
        { error: 'passengerEmail and flightData are required' },
        { status: 400 }
      )
    }

    // Run a preliminary assessment so passenger knows what to expect
    const assessment = assessClaim(flightData)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await createCheckoutSession({
      passengerEmail,
      flightNumber: flightData.flightNumber,
      flightDate: flightData.flightDate,
      successUrl: `${appUrl}/cert/pending?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/submit?cancelled=1`,
      metadata: {
        passengerEmail,
        flightNumber: flightData.flightNumber,
        flightDate: flightData.flightDate,
        airline: flightData.airline,
        route: flightData.route,
        distanceKm: String(flightData.distanceKm),
        delayHours: String(flightData.delayHours),
        delayReason: flightData.delayReason ?? '',
      },
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      preliminaryAssessment: {
        eligible: assessment.eligible,
        amount: assessment.amount,
        confidence: assessment.confidence,
      },
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
