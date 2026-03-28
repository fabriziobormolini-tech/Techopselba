export interface FlightData {
  flightNumber: string
  flightDate: string       // ISO date string
  airline: string          // IATA code
  origin: string           // IATA airport code
  destination: string      // IATA airport code
  route: string            // e.g. "FCO-LHR"
  distanceKm: number
  delayHours: number
  delayReason?: string
  passengerName?: string
}

export interface EU261Result {
  eligible: boolean
  amount: number           // EUR
  confidence: number       // 0-1
  validityScore: number    // 0-100
  reasons: string[]        // explanatory notes
  status: 'VALID' | 'INVALID' | 'NEEDS_HUMAN_REVIEW'
  extraordinaryCircumstance: boolean
  flags: string[]          // issues that reduce confidence
}

export interface OcrResult {
  flightNumber?: string
  flightDate?: string
  passengerName?: string
  origin?: string
  destination?: string
  airline?: string
  bookingReference?: string
  rawText?: string
  confidence: number
  isValid: boolean
  errors: string[]
}

export interface CertificationPayload {
  passengerEmail: string
  flightData: FlightData
  documents: {
    boardingPassKey?: string
    bookingConfirmationKey?: string
  }
  stripeSessionId?: string
}

export interface PublicCertification {
  id: string
  flightNumber: string
  flightDate: string
  airline: string
  route: string
  claimAmount: number
  validityScore: number
  confidence: number
  status: string
  blockchainHash?: string
  createdAt: string
}

export interface AirlineComplianceData {
  airlineCode: string
  airlineName: string
  totalCertifications: number
  validClaims: number
  paidClaims: number
  partialPayments: number
  deniedClaims: number
  avgPaymentDays: number | null
  complianceScore: number
  lastUpdated: string
}

export const AIRLINE_NAMES: Record<string, string> = {
  FR: 'Ryanair',
  U2: 'EasyJet',
  LH: 'Lufthansa',
  AZ: 'ITA Airways',
  W6: 'Wizz Air',
  VY: 'Vueling',
  BA: 'British Airways',
  KL: 'KLM',
  AF: 'Air France',
  IB: 'Iberia',
  TP: 'TAP Air Portugal',
  SK: 'SAS',
  OS: 'Austrian Airlines',
  LX: 'Swiss',
  TK: 'Turkish Airlines',
}

// IATA airport to airport name mapping (subset)
export const AIRPORT_NAMES: Record<string, string> = {
  FCO: 'Rome Fiumicino',
  MXP: 'Milan Malpensa',
  LIN: 'Milan Linate',
  LHR: 'London Heathrow',
  LGW: 'London Gatwick',
  STN: 'London Stansted',
  BCN: 'Barcelona',
  MAD: 'Madrid',
  CDG: 'Paris CDG',
  AMS: 'Amsterdam',
  MUC: 'Munich',
  FRA: 'Frankfurt',
  JFK: 'New York JFK',
  DUB: 'Dublin',
  NAP: 'Naples',
  VCE: 'Venice',
  BLQ: 'Bologna',
  PMO: 'Palermo',
}
