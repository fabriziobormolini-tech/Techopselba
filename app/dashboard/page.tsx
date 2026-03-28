import { prisma } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Airline Compliance Rankings — Techopselba',
  description:
    'Real-time airline compliance data. See which airlines pay EU261 compensation and which don\'t.',
}

export const revalidate = 3600 // Refresh every hour

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-green-100 text-green-700'
      : score >= 60
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700'
  const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {emoji} {score}/100
    </span>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default async function DashboardPage() {
  const airlines = await prisma.airlineStats.findMany({
    orderBy: { complianceScore: 'asc' },
  })

  const totalCerts = airlines.reduce((s, a) => s + a.totalCertifications, 0)
  const avgCompliance =
    airlines.length > 0
      ? Math.round(airlines.reduce((s, a) => s + a.complianceScore, 0) / airlines.length)
      : 0

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Airline Compliance Rankings</h1>
        <p className="text-gray-500 mt-2">
          Based on {totalCerts.toLocaleString()} certified EU261 claims.
          Updated daily. Average compliance: {avgCompliance}%.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Certifications', value: totalCerts.toLocaleString() },
          { label: 'Airlines Tracked', value: airlines.length },
          { label: 'Avg Compliance Rate', value: `${avgCompliance}%` },
          {
            label: 'Best Performer',
            value: airlines.sort((a, b) => b.complianceScore - a.complianceScore)[0]?.airlineName ?? '—',
          },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Airline table */}
      <div className="card overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">All Airlines</h2>
          <span className="text-xs text-gray-400">
            Sorted by compliance score (worst first)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-6 py-3">Airline</th>
                <th className="text-right px-4 py-3">Certifications</th>
                <th className="text-right px-4 py-3">Valid Claims</th>
                <th className="text-right px-4 py-3">Reported Paid</th>
                <th className="text-left px-4 py-3 min-w-[120px]">Pay Rate</th>
                <th className="text-right px-4 py-3">Avg Days to Pay</th>
                <th className="text-right px-6 py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {[...airlines].sort((a, b) => a.complianceScore - b.complianceScore).map((airline, i) => {
                const payRate =
                  airline.validClaims > 0
                    ? Math.round((airline.paidClaims / airline.validClaims) * 100)
                    : 0
                return (
                  <tr
                    key={airline.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-300 text-xs w-4">#{i + 1}</span>
                        <div>
                          <div className="font-medium text-gray-900">{airline.airlineName}</div>
                          <div className="text-xs text-gray-400">{airline.airlineCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-4 py-4 text-gray-600">
                      {airline.totalCertifications.toLocaleString()}
                    </td>
                    <td className="text-right px-4 py-4 text-gray-600">
                      {airline.validClaims.toLocaleString()}
                    </td>
                    <td className="text-right px-4 py-4">
                      <span className={airline.paidClaims < airline.validClaims * 0.5 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {airline.paidClaims.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={airline.paidClaims}
                          max={airline.validClaims}
                          color={payRate >= 80 ? 'bg-green-500' : payRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'}
                        />
                        <span className="text-xs text-gray-500 w-8 text-right">{payRate}%</span>
                      </div>
                    </td>
                    <td className="text-right px-4 py-4 text-gray-600">
                      {airline.avgPaymentDays ? `${Math.round(airline.avgPaymentDays)}d` : '—'}
                    </td>
                    <td className="text-right px-6 py-4">
                      <ScoreBadge score={airline.complianceScore} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology note */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
        <strong>Methodology:</strong> Compliance scores are based on passenger-reported outcomes
        for certified claims. A claim is &quot;reported paid&quot; when the passenger confirms payment via
        our 30-day follow-up. Scores reflect voluntary reporting and may undercount actual
        payment rates. Data last refreshed: {new Date().toLocaleDateString('en-GB')}.
      </div>

      {/* API CTA */}
      <div className="mt-6 p-6 card text-center">
        <h3 className="font-semibold text-gray-900 mb-2">Need this data programmatically?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Our public API returns compliance data for any airline. Free tier: 100 req/day.
        </p>
        <code className="text-xs bg-gray-100 px-3 py-2 rounded text-gray-700 block mb-4">
          GET /api/airlines/FR
        </code>
        <a href="/api/airlines" className="btn-secondary text-sm">
          View Full API Response
        </a>
      </div>
    </main>
  )
}
