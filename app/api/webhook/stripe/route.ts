import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createCertification } from '@/lib/certification'
import type { FlightData } from '@/types'

export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event
  try {
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const meta = session.metadata ?? {}

    const flightData: FlightData = {
      flightNumber: meta.flightNumber ?? '',
      flightDate: meta.flightDate ?? '',
      airline: meta.airline ?? '',
      origin: meta.route?.split('-')[0] ?? '',
      destination: meta.route?.split('-')[1] ?? '',
      route: meta.route ?? '',
      distanceKm: parseInt(meta.distanceKm ?? '0', 10),
      delayHours: parseFloat(meta.delayHours ?? '0'),
      delayReason: meta.delayReason || undefined,
    }

    try {
      const { cert } = await createCertification({
        passengerEmail: meta.passengerEmail ?? session.customer_email ?? '',
        flightData,
        documents: {},
        stripeSessionId: session.id,
      })

      console.log(`Certification created: ${cert.id} for session ${session.id}`)
    } catch (err) {
      console.error('Failed to create certification after payment:', err)
      // Don't return 500 — Stripe will retry. Log and investigate.
    }
  }

  return NextResponse.json({ received: true })
}
