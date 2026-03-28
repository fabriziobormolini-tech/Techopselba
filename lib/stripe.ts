import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Payment features will be disabled.')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

export const CERTIFICATION_PRICE_CENTS =
  parseInt(process.env.CERTIFICATION_PRICE_CENTS ?? '2500', 10)

export async function createCheckoutSession(params: {
  passengerEmail: string
  flightNumber: string
  flightDate: string
  successUrl: string
  cancelUrl: string
  metadata: Record<string, string>
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: params.passengerEmail,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Flight Claim Certification',
            description: `EU261 certification for flight ${params.flightNumber} on ${params.flightDate}`,
          },
          unit_amount: CERTIFICATION_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  })

  return session
}
