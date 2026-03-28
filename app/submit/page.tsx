'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AIRLINE_NAMES } from '@/types'

type Step = 'flight' | 'documents' | 'review' | 'payment'

interface FormState {
  // Contact
  passengerEmail: string
  // Flight details
  flightNumber: string
  flightDate: string
  airline: string
  origin: string
  destination: string
  distanceKm: string
  delayHours: string
  delayReason: string
  // Documents
  boardingPassFile: File | null
  bookingConfFile: File | null
}

const INITIAL_STATE: FormState = {
  passengerEmail: '',
  flightNumber: '',
  flightDate: '',
  airline: '',
  origin: '',
  destination: '',
  distanceKm: '',
  delayHours: '',
  delayReason: '',
  boardingPassFile: null,
  bookingConfFile: null,
}

const STEPS: Step[] = ['flight', 'documents', 'review', 'payment']

export default function SubmitPage() {
  const [step, setStep] = useState<Step>('flight')
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const router = useRouter()

  const update = (field: keyof FormState, value: string | File | null) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleOcr = async (file: File, type: 'BOARDING_PASS' | 'BOOKING_CONFIRMATION') => {
    setOcrLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      const res = await fetch('/api/ocr', { method: 'POST', body: fd })
      if (!res.ok) return
      const data = await res.json()
      if (data.flightNumber && !form.flightNumber) update('flightNumber', data.flightNumber)
      if (data.flightDate && !form.flightDate) update('flightDate', data.flightDate)
      if (data.origin && !form.origin) update('origin', data.origin)
      if (data.destination && !form.destination) update('destination', data.destination)
      if (data.airline && !form.airline) update('airline', data.airline)
    } finally {
      setOcrLoading(false)
    }
  }

  const handleFileChange = (
    field: 'boardingPassFile' | 'bookingConfFile',
    type: 'BOARDING_PASS' | 'BOOKING_CONFIRMATION',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] ?? null
    update(field, file)
    if (file) handleOcr(file, type)
  }

  const handleCheckout = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passengerEmail: form.passengerEmail,
          flightData: {
            flightNumber: form.flightNumber,
            flightDate: form.flightDate,
            airline: form.airline,
            origin: form.origin,
            destination: form.destination,
            route: `${form.origin}-${form.destination}`,
            distanceKm: parseInt(form.distanceKm || '0', 10),
            delayHours: parseFloat(form.delayHours || '0'),
            delayReason: form.delayReason || undefined,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create checkout')
      if (data.url) window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Certify Your Flight Claim</h1>
        <p className="text-gray-500 mt-1 text-sm">
          EU261 independent certification — €25 — takes 5 minutes
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-10">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                i < stepIndex
                  ? 'bg-blue-600 text-white'
                  : i === stepIndex
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < stepIndex ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 w-12 ${i < stepIndex ? 'bg-blue-600' : 'bg-gray-100'}`} />
            )}
          </div>
        ))}
        <span className="ml-2 text-xs text-gray-400 capitalize">{step.replace('-', ' ')}</span>
      </div>

      {/* Step 1: Flight Details */}
      {step === 'flight' && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-900">Flight Details</h2>

          <div>
            <label className="label">Your Email</label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={form.passengerEmail}
              onChange={(e) => update('passengerEmail', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">We&apos;ll send your certification here. Never shared.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Flight Number</label>
              <input
                className="input"
                placeholder="FR1234"
                value={form.flightNumber}
                onChange={(e) => update('flightNumber', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label">Flight Date</label>
              <input
                type="date"
                className="input"
                value={form.flightDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => update('flightDate', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Airline</label>
            <select
              className="input"
              value={form.airline}
              onChange={(e) => update('airline', e.target.value)}
            >
              <option value="">Select airline...</option>
              {Object.entries(AIRLINE_NAMES).map(([code, name]) => (
                <option key={code} value={code}>{name} ({code})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Origin Airport (IATA)</label>
              <input
                className="input"
                placeholder="FCO"
                maxLength={3}
                value={form.origin}
                onChange={(e) => update('origin', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="label">Destination Airport (IATA)</label>
              <input
                className="input"
                placeholder="LHR"
                maxLength={3}
                value={form.destination}
                onChange={(e) => update('destination', e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Route Distance (km)</label>
              <input
                type="number"
                className="input"
                placeholder="1434"
                value={form.distanceKm}
                onChange={(e) => update('distanceKm', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Actual Delay (hours)</label>
              <input
                type="number"
                step="0.5"
                className="input"
                placeholder="4.5"
                value={form.delayHours}
                onChange={(e) => update('delayHours', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Delay Reason (if known)</label>
            <input
              className="input"
              placeholder="e.g. Technical issue, Late aircraft, Crew shortage..."
              value={form.delayReason}
              onChange={(e) => update('delayReason', e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Extraordinary circumstances (severe weather, ATC strikes) may reduce eligibility.
            </p>
          </div>

          <button
            className="btn-primary w-full"
            disabled={
              !form.passengerEmail ||
              !form.flightNumber ||
              !form.flightDate ||
              !form.delayHours
            }
            onClick={() => setStep('documents')}
          >
            Continue to Documents
          </button>
        </div>
      )}

      {/* Step 2: Documents */}
      {step === 'documents' && (
        <div className="card space-y-6">
          <h2 className="font-semibold text-gray-900">Upload Documents</h2>
          <p className="text-sm text-gray-500">
            Upload your boarding pass and booking confirmation. Our OCR will extract
            flight data automatically for verification.
          </p>

          {ocrLoading && (
            <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-4 py-2">
              Extracting data from document...
            </div>
          )}

          <div className="space-y-4">
            {[
              {
                field: 'boardingPassFile' as const,
                type: 'BOARDING_PASS' as const,
                label: 'Boarding Pass',
                hint: 'Photo or PDF of your boarding pass',
              },
              {
                field: 'bookingConfFile' as const,
                type: 'BOOKING_CONFIRMATION' as const,
                label: 'Booking Confirmation',
                hint: 'Email confirmation or receipt',
              },
            ].map(({ field, type, label, hint }) => (
              <div key={field}>
                <label className="label">{label}</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-300 transition-colors">
                  {form[field] ? (
                    <div className="text-sm text-green-600 font-medium">
                      ✓ {(form[field] as File).name}
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400">{hint}</p>
                      <p className="text-xs text-gray-300 mt-1">JPEG, PNG, or PDF · max 10 MB</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="mt-3 text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    onChange={(e) => handleFileChange(field, type, e)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setStep('flight')}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              onClick={() => setStep('review')}
            >
              Continue to Review
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <div className="card space-y-5">
          <h2 className="font-semibold text-gray-900">Review Your Claim</h2>

          <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
            {[
              ['Flight', `${form.flightNumber} · ${form.airline}`],
              ['Date', form.flightDate],
              ['Route', `${form.origin} → ${form.destination}`],
              ['Distance', form.distanceKm ? `${form.distanceKm} km` : 'Not specified'],
              ['Delay', `${form.delayHours} hours`],
              ['Reason', form.delayReason || '—'],
              ['Email', form.passengerEmail],
            ].map(([key, val]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-500">{key}</span>
                <span className="font-medium text-gray-900">{val}</span>
              </div>
            ))}
          </div>

          <div className="border border-blue-100 bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">What you get</p>
            <ul className="space-y-1 text-blue-600">
              <li>✓ Independent EU261 eligibility assessment</li>
              <li>✓ Validity score (0–100) with confidence rating</li>
              <li>✓ Permanent public certification URL</li>
              <li>✓ Blockchain-anchored hash (immutable proof)</li>
              <li>✓ Shareable certificate (PDF, QR code)</li>
            </ul>
          </div>

          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl">
            <span className="font-semibold text-gray-900">Certification Fee</span>
            <span className="text-2xl font-bold text-gray-900">€25</span>
          </div>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => setStep('documents')}>
              Back
            </button>
            <button className="btn-primary flex-1" onClick={() => setStep('payment')}>
              Proceed to Payment
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 'payment' && (
        <div className="card space-y-6">
          <h2 className="font-semibold text-gray-900">Payment</h2>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">Flight Claim Certification</p>
              <p className="text-sm text-gray-500">
                {form.flightNumber} · {form.flightDate}
              </p>
            </div>
            <span className="text-xl font-bold">€25</span>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            className="btn-primary w-full text-base py-4"
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading ? 'Redirecting to Stripe...' : 'Pay €25 — Certify My Claim'}
          </button>

          <p className="text-xs text-center text-gray-400">
            Secure payment via Stripe · Your card details never touch our servers
          </p>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1 text-sm" onClick={() => setStep('review')}>
              Back
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
