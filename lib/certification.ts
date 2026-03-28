/**
 * Certification creation and blockchain hashing.
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/db'
import { assessClaim } from '@/lib/rules-engine'
import type { CertificationPayload } from '@/types'
import { CertificationStatus } from '@prisma/client'

/**
 * Generate a deterministic SHA-256 hash for a certification.
 * This hash is what would be recorded on-chain for immutability.
 */
export function generateCertificationHash(data: {
  id: string
  flightNumber: string
  flightDate: string
  amount: number
  validityScore: number
  createdAt: string
}): string {
  const payload = JSON.stringify({
    id: data.id,
    flight: data.flightNumber,
    date: data.flightDate,
    amount: data.amount,
    score: data.validityScore,
    ts: data.createdAt,
  })
  return createHash('sha256').update(payload).digest('hex')
}

/**
 * Hash passenger email for privacy (one-way).
 */
export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
}

/**
 * Create a new certification record in the database.
 */
export async function createCertification(payload: CertificationPayload) {
  const { flightData, passengerEmail, stripeSessionId } = payload

  const assessment = assessClaim(flightData)

  const statusMap: Record<typeof assessment.status, CertificationStatus> = {
    VALID: CertificationStatus.VALID,
    INVALID: CertificationStatus.INVALID,
    NEEDS_HUMAN_REVIEW: CertificationStatus.NEEDS_HUMAN_REVIEW,
  }

  const cert = await prisma.certification.create({
    data: {
      flightNumber: flightData.flightNumber,
      flightDate: new Date(flightData.flightDate),
      passengerEmail: hashEmail(passengerEmail),
      airline: flightData.airline,
      route: flightData.route,
      distanceKm: flightData.distanceKm,
      delayHours: flightData.delayHours,
      delayReason: flightData.delayReason,
      claimAmount: assessment.amount,
      validityScore: assessment.validityScore,
      confidence: assessment.confidence,
      status: statusMap[assessment.status],
      isPublic: true,
      stripeSessionId: stripeSessionId ?? null,
      paidAt: stripeSessionId ? new Date() : null,
    },
  })

  // Generate and store blockchain hash
  const hash = generateCertificationHash({
    id: cert.id,
    flightNumber: cert.flightNumber,
    flightDate: cert.flightDate.toISOString(),
    amount: cert.claimAmount,
    validityScore: cert.validityScore,
    createdAt: cert.createdAt.toISOString(),
  })

  const updated = await prisma.certification.update({
    where: { id: cert.id },
    data: { blockchainHash: hash },
  })

  // Update airline aggregate stats
  await updateAirlineStats(flightData.airline, assessment.status === 'VALID')

  return { cert: updated, assessment }
}

/**
 * Increment airline certification counters.
 */
async function updateAirlineStats(airlineCode: string, isValid: boolean) {
  await prisma.airlineStats.upsert({
    where: { airlineCode },
    update: {
      totalCertifications: { increment: 1 },
      validClaims: isValid ? { increment: 1 } : undefined,
      lastUpdated: new Date(),
    },
    create: {
      airlineCode,
      airlineName: airlineCode, // will be enriched later
      totalCertifications: 1,
      validClaims: isValid ? 1 : 0,
      paidClaims: 0,
      partialPayments: 0,
      deniedClaims: 0,
      complianceScore: 0,
    },
  })
}
