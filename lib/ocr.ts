/**
 * OCR Document Processing
 *
 * Extracts structured flight data from boarding passes and booking confirmations.
 * Primary: Google Cloud Vision API
 * Fallback: Tesseract (open source) or manual extraction patterns
 */

import type { OcrResult } from '@/types'

// Flight number pattern: 2-letter IATA code + 1-4 digits (optional letter suffix)
const FLIGHT_NUMBER_REGEX = /\b([A-Z]{2})\s*(\d{1,4}[A-Z]?)\b/g

// Date patterns (multiple formats)
const DATE_PATTERNS = [
  /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/,  // DD/MM/YYYY or MM/DD/YYYY
  /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{2,4})/i,
  /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,    // YYYY-MM-DD
]

// Airport code pattern: 3 capital letters
const AIRPORT_CODE_REGEX = /\b([A-Z]{3})\b/g

// Booking reference: 6 alphanumeric chars
const BOOKING_REF_REGEX = /\b([A-Z0-9]{6})\b/g

const MONTH_MAP: Record<string, string> = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04',
  MAY: '05', JUN: '06', JUL: '07', AUG: '08',
  SEP: '09', OCT: '10', NOV: '11', DEC: '12',
}

// Known airline IATA codes for validation
const KNOWN_AIRLINES = new Set([
  'FR', 'U2', 'LH', 'AZ', 'W6', 'VY', 'BA', 'KL', 'AF',
  'IB', 'TP', 'SK', 'OS', 'LX', 'SN', 'EI', 'DY', 'TK',
  'AA', 'UA', 'DL', 'SW', 'WN', 'AS',
])

// Known airport codes for validation
const KNOWN_AIRPORTS = new Set([
  'FCO', 'MXP', 'LIN', 'NAP', 'VCE', 'BLQ', 'PMO',
  'LHR', 'LGW', 'STN', 'LTN', 'MAN', 'EDI', 'GLA',
  'BCN', 'MAD', 'AGP', 'PMI', 'VLC',
  'CDG', 'ORY', 'NCE', 'LYS', 'MRS',
  'AMS', 'RTM', 'EIN',
  'MUC', 'FRA', 'DUS', 'TXL', 'BER', 'HAM', 'STR',
  'JFK', 'EWR', 'LAX', 'ORD', 'ATL', 'MIA', 'SFO',
  'DUB', 'BHD',
  'ZRH', 'GVA', 'BSL',
  'VIE', 'PRG', 'WAW', 'BUD', 'BEG', 'OTP',
])

function extractFlightNumber(text: string): string | undefined {
  const matches = [...text.matchAll(FLIGHT_NUMBER_REGEX)]
  for (const match of matches) {
    const code = match[1]
    const num = match[2]
    if (KNOWN_AIRLINES.has(code)) {
      return `${code}${num}`
    }
  }
  return undefined
}

function extractDate(text: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      // Try to normalise to YYYY-MM-DD
      if (pattern === DATE_PATTERNS[1]) {
        // "15 MAR 2025"
        const day = match[1].padStart(2, '0')
        const month = MONTH_MAP[match[2].toUpperCase()]
        const year = match[3].length === 2 ? `20${match[3]}` : match[3]
        return `${year}-${month}-${day}`
      }
      if (pattern === DATE_PATTERNS[2]) {
        // YYYY-MM-DD already
        return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      }
      // DD/MM/YYYY heuristic
      const a = parseInt(match[1])
      const b = parseInt(match[2])
      const year = match[3].length === 2 ? `20${match[3]}` : match[3]
      if (a > 12) {
        return `${year}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
      }
      return `${year}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
    }
  }
  return undefined
}

function extractAirports(text: string): { origin?: string; destination?: string } {
  const codes = [...text.matchAll(AIRPORT_CODE_REGEX)]
    .map((m) => m[1])
    .filter((c) => KNOWN_AIRPORTS.has(c))

  const unique = [...new Set(codes)]
  return {
    origin: unique[0],
    destination: unique[1],
  }
}

function extractAirline(flightNumber: string | undefined): string | undefined {
  if (!flightNumber || flightNumber.length < 2) return undefined
  const code = flightNumber.substring(0, 2)
  return KNOWN_AIRLINES.has(code) ? code : undefined
}

/**
 * Parse raw OCR text into structured flight data.
 */
export function parseOcrText(rawText: string, documentType: 'BOARDING_PASS' | 'BOOKING_CONFIRMATION'): OcrResult {
  const errors: string[] = []
  const text = rawText.toUpperCase()

  const flightNumber = extractFlightNumber(text)
  const flightDate = extractDate(rawText) // keep original case for date patterns
  const { origin, destination } = extractAirports(text)
  const airline = extractAirline(flightNumber)

  // Passenger name: "MR/MS SURNAME/FIRSTNAME" or "FIRSTNAME SURNAME"
  const nameMatch = rawText.match(/\b([A-Z]{2,20}\/[A-Z]{2,20})\b/) ||
                    rawText.match(/(?:passenger|name)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i)
  const passengerName = nameMatch?.[1]

  // Booking reference
  const bookingMatch = rawText.match(/(?:booking|pnr|reference|ref)[:\s#]*([A-Z0-9]{6})/i)
  const bookingReference = bookingMatch?.[1]

  // Confidence calculation
  let confidence = 0.5
  if (flightNumber) confidence += 0.2
  if (flightDate) confidence += 0.15
  if (origin && destination) confidence += 0.1
  if (airline) confidence += 0.05

  if (!flightNumber) errors.push('Could not extract flight number')
  if (!flightDate) errors.push('Could not extract flight date')
  if (!origin || !destination) errors.push('Could not extract airport codes')

  return {
    flightNumber,
    flightDate,
    passengerName,
    origin,
    destination,
    airline,
    bookingReference,
    rawText,
    confidence: parseFloat(confidence.toFixed(2)),
    isValid: confidence >= 0.7,
    errors,
  }
}

/**
 * Google Cloud Vision OCR.
 * Requires GOOGLE_CLOUD_API_KEY in env.
 */
async function callGoogleVisionOcr(imageBase64: string): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY
  if (!apiKey) throw new Error('GOOGLE_CLOUD_API_KEY not configured')

  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`
  const body = {
    requests: [
      {
        image: { content: imageBase64 },
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
      },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Vision API error: ${err}`)
  }

  const data = await res.json()
  return data.responses?.[0]?.fullTextAnnotation?.text ?? ''
}

/**
 * Main OCR entry point.
 * Accepts a Buffer (image or PDF bytes) and document type.
 * Returns structured OcrResult.
 */
export async function processDocument(
  fileBuffer: Buffer,
  documentType: 'BOARDING_PASS' | 'BOOKING_CONFIRMATION',
  mimeType: string = 'image/jpeg'
): Promise<OcrResult> {
  const imageBase64 = fileBuffer.toString('base64')

  let rawText = ''

  if (process.env.GOOGLE_CLOUD_API_KEY) {
    try {
      rawText = await callGoogleVisionOcr(imageBase64)
    } catch (err) {
      console.warn('Google Vision OCR failed, falling back to regex extraction:', err)
    }
  }

  // Development fallback: return a stub result if no OCR key is configured
  if (!rawText && process.env.NODE_ENV === 'development') {
    console.warn('OCR: No API key configured. Returning stub result for development.')
    return {
      confidence: 0,
      isValid: false,
      errors: ['OCR service not configured. Please provide GOOGLE_CLOUD_API_KEY.'],
    }
  }

  return parseOcrText(rawText, documentType)
}
