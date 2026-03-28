/**
 * EU Regulation 261/2004 Rules Engine
 *
 * Determines flight compensation eligibility and amount.
 * Handles distance-based amounts, extraordinary circumstances,
 * and partial compensation rules.
 */

import type { FlightData, EU261Result } from '@/types'

// Compensation amounts (EUR) by distance
const COMPENSATION = {
  SHORT: 250,    // < 1500 km
  MEDIUM: 400,   // 1500–3500 km (or intra-EU > 1500 km)
  LONG: 600,     // > 3500 km
  LONG_REDUCED: 300, // > 3500 km but delay 3-4h (reduced 50% by airline)
}

// Minimum delay threshold in hours
const MIN_DELAY_HOURS = 3

// Extraordinary circumstances (airline not liable)
const EXTRAORDINARY_CIRCUMSTANCES = [
  'severe weather',
  'extreme weather',
  'storm',
  'hurricane',
  'snow closure',
  'fog closure',
  'political instability',
  'political unrest',
  'civil unrest',
  'security risk',
  'security threat',
  'terror',
  'air traffic control strike',
  'atc strike',
  'atc restriction',
  'air space closure',
  'bird strike',
  'birdstrike',
  'medical emergency',
  'airport closure',
  'volcanic ash',
  'natural disaster',
  'government order',
]

// Carrier-caused reasons that increase confidence
const CARRIER_FAULT_REASONS = [
  'technical',
  'technical issue',
  'technical problem',
  'mechanical',
  'maintenance',
  'crew shortage',
  'crew unavailability',
  'late aircraft',
  'operational',
  'commercial',
  'strike',          // airline/crew strike (not ATC)
  'it failure',
  'system failure',
]

// IATA airline codes for EU/EEA carriers
const EU_CARRIER_CODES = new Set([
  'FR', 'U2', 'LH', 'AZ', 'W6', 'VY', 'BA', 'KL', 'AF',
  'IB', 'TP', 'SK', 'OS', 'LX', 'SN', 'EI', 'DY', 'BT',
  'PS', 'FZ', 'WX', 'TOM', 'TCX', 'BY', 'ZB', 'MO', 'OA',
])

/**
 * Approximate great-circle distance for common routes.
 * In production this would call a routing API or use a full airport DB.
 */
const ROUTE_DISTANCES: Record<string, number> = {
  'FCO-LHR': 1434, 'LHR-FCO': 1434,
  'MXP-BCN': 895,  'BCN-MXP': 895,
  'FCO-BCN': 1362, 'BCN-FCO': 1362,
  'FCO-CDG': 1108, 'CDG-FCO': 1108,
  'MXP-LHR': 963,  'LHR-MXP': 963,
  'FCO-MAD': 1925, 'MAD-FCO': 1925,
  'FCO-AMS': 1622, 'AMS-FCO': 1622,
  'FCO-FRA': 1562, 'FRA-FCO': 1562,
  'MUC-JFK': 7700, 'JFK-MUC': 7700,
  'LHR-JFK': 5539, 'JFK-LHR': 5539,
  'FCO-JFK': 8229, 'JFK-FCO': 8229,
  'CDG-JFK': 5820, 'JFK-CDG': 5820,
}

function estimateDistance(origin: string, destination: string): number | null {
  const key = `${origin.toUpperCase()}-${destination.toUpperCase()}`
  return ROUTE_DISTANCES[key] ?? null
}

function isExtraordinaryCircumstance(reason: string): boolean {
  if (!reason) return false
  const lower = reason.toLowerCase()
  return EXTRAORDINARY_CIRCUMSTANCES.some((ec) => lower.includes(ec))
}

function isCarrierFault(reason: string): boolean {
  if (!reason) return false
  const lower = reason.toLowerCase()
  return CARRIER_FAULT_REASONS.some((cf) => lower.includes(cf))
}

function compensationAmount(distanceKm: number, delayHours: number): number {
  if (distanceKm < 1500) return COMPENSATION.SHORT
  if (distanceKm <= 3500) return COMPENSATION.MEDIUM
  // > 3500 km: reduced to €300 if delay is 3–4h
  if (delayHours < 4) return COMPENSATION.LONG_REDUCED
  return COMPENSATION.LONG
}

export function assessClaim(data: FlightData): EU261Result {
  const reasons: string[] = []
  const flags: string[] = []
  let confidence = 0.9   // start high, reduce on uncertainty
  let eligible = true

  // --- 1. Minimum delay check ---
  if (data.delayHours < MIN_DELAY_HOURS) {
    return {
      eligible: false,
      amount: 0,
      confidence: 0.98,
      validityScore: 2,
      reasons: [`Delay (${data.delayHours}h) is below the 3-hour minimum threshold.`],
      status: 'INVALID',
      extraordinaryCircumstance: false,
      flags: [],
    }
  }
  reasons.push(`Delay of ${data.delayHours}h meets the ≥3h threshold.`)

  // --- 2. Distance determination ---
  let distance = data.distanceKm
  if (!distance || distance <= 0) {
    const estimated = estimateDistance(data.origin, data.destination)
    if (estimated) {
      distance = estimated
      reasons.push(`Distance estimated at ${distance} km based on route ${data.route}.`)
    } else {
      flags.push('Distance unknown — manual check required.')
      confidence -= 0.15
      distance = 0
    }
  }

  // --- 3. Extraordinary circumstances ---
  const isEC = isExtraordinaryCircumstance(data.delayReason ?? '')
  if (isEC) {
    return {
      eligible: false,
      amount: 0,
      confidence: 0.85,
      validityScore: 10,
      reasons: [
        `Delay reason "${data.delayReason}" qualifies as an extraordinary circumstance under EU261.`,
        'Airlines are exempt from compensation in such cases.',
      ],
      status: 'INVALID',
      extraordinaryCircumstance: true,
      flags: ['Extraordinary circumstance — verify with supporting documentation.'],
    }
  }

  // --- 4. Carrier fault boosts confidence ---
  if (data.delayReason) {
    if (isCarrierFault(data.delayReason)) {
      reasons.push(`Delay reason "${data.delayReason}" is typically carrier-caused.`)
      confidence = Math.min(confidence + 0.04, 0.99)
    } else {
      flags.push(`Delay reason "${data.delayReason}" is ambiguous — human review recommended.`)
      confidence -= 0.05
    }
  } else {
    flags.push('No delay reason provided — defaulting to carrier liability assumption.')
    confidence -= 0.05
  }

  // --- 5. Amount calculation ---
  const amount = distance > 0 ? compensationAmount(distance, data.delayHours) : 0

  if (distance > 0) {
    reasons.push(
      `Route distance (${distance} km) → compensation tier: €${amount}.`
    )
  }

  // --- 6. Flight date validation ---
  const flightDateObj = new Date(data.flightDate)
  const now = new Date()
  const ageYears = (now.getTime() - flightDateObj.getTime()) / (1000 * 60 * 60 * 24 * 365)
  if (ageYears > 3) {
    flags.push('Flight is older than 3 years — check statute of limitations for jurisdiction.')
    confidence -= 0.1
    eligible = false
    reasons.push('Claim may be time-barred (> 3 years old).')
  }
  if (flightDateObj > now) {
    flags.push('Flight date is in the future — cannot certify a future flight.')
    eligible = false
    confidence = 0.0
  }

  // --- 7. Determine final status ---
  const validityScore = Math.round(confidence * 100)

  let status: EU261Result['status']
  if (!eligible || amount === 0) {
    status = 'INVALID'
  } else if (confidence < 0.75) {
    status = 'NEEDS_HUMAN_REVIEW'
  } else {
    status = 'VALID'
  }

  return {
    eligible: eligible && amount > 0,
    amount,
    confidence: parseFloat(confidence.toFixed(2)),
    validityScore,
    reasons,
    status,
    extraordinaryCircumstance: false,
    flags,
  }
}
