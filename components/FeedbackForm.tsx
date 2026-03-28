'use client'

import { useState } from 'react'

interface Props {
  certificationId: string
}

const OUTCOMES = [
  { value: 'PAID_FULL', label: 'Yes — paid in full', color: 'text-green-700' },
  { value: 'PAID_PARTIAL', label: 'Yes — partial payment', color: 'text-yellow-700' },
  { value: 'DENIED', label: 'No — claim denied', color: 'text-red-700' },
  { value: 'NO_RESPONSE', label: 'No response yet', color: 'text-gray-600' },
]

export default function FeedbackForm({ certificationId }: Props) {
  const [selected, setSelected] = useState('')
  const [daysToPay, setDaysToPay] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!selected) return
    setLoading(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationId,
          outcome: selected,
          daysToPay: daysToPay ? parseInt(daysToPay) : undefined,
        }),
      })
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="card text-center">
        <div className="text-2xl mb-2">Thank you</div>
        <p className="text-sm text-gray-500">
          Your response helps build our airline compliance database.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-1">Did the airline pay?</h3>
      <p className="text-sm text-gray-500 mb-4">
        Your response is anonymous and updates the public compliance dashboard.
      </p>
      <div className="space-y-2 mb-4">
        {OUTCOMES.map((o) => (
          <button
            key={o.value}
            onClick={() => setSelected(o.value)}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-colors text-sm ${
              selected === o.value
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${o.color}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {(selected === 'PAID_FULL' || selected === 'PAID_PARTIAL') && (
        <div className="mb-4">
          <label className="label">How many days did it take to receive payment?</label>
          <input
            type="number"
            className="input"
            placeholder="e.g. 45"
            value={daysToPay}
            onChange={(e) => setDaysToPay(e.target.value)}
          />
        </div>
      )}

      <button
        className="btn-primary w-full"
        disabled={!selected || loading}
        onClick={submit}
      >
        {loading ? 'Submitting...' : 'Submit Response'}
      </button>
    </div>
  )
}
