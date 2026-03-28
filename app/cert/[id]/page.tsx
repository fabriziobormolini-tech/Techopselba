import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { AIRLINE_NAMES } from '@/types'
import type { Metadata } from 'next'
import CertificationActions from '@/components/CertificationActions'
import FeedbackForm from '@/components/FeedbackForm'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cert = await prisma.certification.findUnique({
    where: { id: params.id },
    select: { flightNumber: true, airline: true, status: true },
  })
  if (!cert) return { title: 'Certification Not Found' }
  return {
    title: `Certification ${cert.flightNumber} — Techopselba`,
    description: `Independent EU261 certification for flight ${cert.flightNumber}. Status: ${cert.status}.`,
  }
}

const STATUS_CONFIG = {
  VALID: {
    label: 'VERIFIED VALID',
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    icon: '✓',
  },
  INVALID: {
    label: 'NOT ELIGIBLE',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    icon: '✗',
  },
  NEEDS_HUMAN_REVIEW: {
    label: 'UNDER REVIEW',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-700',
    icon: '⏳',
  },
  PENDING_REVIEW: {
    label: 'PROCESSING',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: '⏳',
  },
  PROCESSING: {
    label: 'PROCESSING',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    icon: '⏳',
  },
  PENDING_PAYMENT: {
    label: 'PENDING PAYMENT',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: '💳',
  },
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function CertificationPage({ params }: Props) {
  const cert = await prisma.certification.findUnique({
    where: { id: params.id },
  })

  if (!cert || !cert.isPublic) notFound()

  const config = STATUS_CONFIG[cert.status] ?? STATUS_CONFIG.PENDING_REVIEW
  const airlineName = AIRLINE_NAMES[cert.airline] ?? cert.airline

  const fields = [
    { label: 'Certification ID', value: cert.id, mono: true },
    { label: 'Flight Number', value: cert.flightNumber },
    { label: 'Flight Date', value: formatDate(cert.flightDate) },
    { label: 'Airline', value: `${airlineName} (${cert.airline})` },
    { label: 'Route', value: cert.route },
    { label: 'Distance', value: `${cert.distanceKm.toLocaleString()} km` },
    { label: 'Delay', value: `${cert.delayHours} hours` },
    { label: 'Compensation Entitled', value: `€${cert.claimAmount}` },
    { label: 'Validity Score', value: `${cert.validityScore}/100` },
    { label: 'Confidence', value: `${Math.round(cert.confidence * 100)}%` },
    { label: 'Certified On', value: formatDate(cert.createdAt) },
    {
      label: 'Blockchain Hash',
      value: cert.blockchainHash ? `0x${cert.blockchainHash.substring(0, 16)}...` : 'Pending',
      mono: true,
    },
  ]

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-sm text-gray-400 mb-2">Techopselba Independent Certification Authority</p>
        <h1 className="text-2xl font-bold text-gray-900">Flight Claim Certificate</h1>
      </div>

      {/* Status banner */}
      <div className={`rounded-2xl border-2 ${config.border} ${config.bg} p-6 mb-6 text-center`}>
        <div className={`text-4xl font-bold ${config.text} mb-2`}>
          {config.icon} {config.label}
        </div>
        <p className={`text-sm ${config.text}`}>
          {cert.status === 'VALID' &&
            `This flight claim has been independently certified as valid under EU Regulation 261/2004.`}
          {cert.status === 'INVALID' &&
            `This claim does not meet EU261 eligibility criteria based on our assessment.`}
          {(cert.status === 'NEEDS_HUMAN_REVIEW' || cert.status === 'PENDING_REVIEW' || cert.status === 'PROCESSING') &&
            `This certification is currently being reviewed by our team.`}
        </p>
      </div>

      {/* Certificate details */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">TE</span>
            </div>
            <span className="font-semibold text-gray-900">Techopselba</span>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {cert.id.substring(0, 8).toUpperCase()}
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(({ label, value, mono }) => (
            <div key={label} className="py-2 border-b border-gray-50">
              <dt className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</dt>
              <dd className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {cert.status === 'VALID' && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              This certificate is blockchain-anchored and tamper-evident.
              Hash verifiable on any SHA-256 calculator.
            </div>
          </div>
        )}
      </div>

      {/* Actions (copy URL, PDF, QR) */}
      <CertificationActions certId={cert.id} />

      {/* Feedback form */}
      {cert.status === 'VALID' && (
        <div className="mt-8">
          <FeedbackForm certificationId={cert.id} />
        </div>
      )}

      {/* Legal notice */}
      <p className="text-xs text-gray-400 text-center mt-8">
        This certificate represents Techopselba&apos;s independent assessment of EU261 eligibility.
        It is not legal advice. Assessment accuracy: 94% based on beta program data.
      </p>
    </main>
  )
}
