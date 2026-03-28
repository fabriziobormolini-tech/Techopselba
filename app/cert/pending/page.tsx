'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function PendingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'found' | 'not_found'>('loading')
  const [certId, setCertId] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!sessionId) {
      setStatus('not_found')
      return
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/certifications/by-session?session_id=${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setCertId(data.id)
          setStatus('found')
          setTimeout(() => router.push(`/cert/${data.id}`), 1500)
          return true
        }
      } catch {}
      return false
    }

    // Poll every 2 seconds, up to 30 seconds
    const interval = setInterval(async () => {
      setAttempts((a) => a + 1)
      const found = await poll()
      if (found || attempts >= 15) clearInterval(interval)
    }, 2000)

    poll()
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-6" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Processing Your Certification</h1>
            <p className="text-gray-500 text-sm">
              Payment received. We&apos;re running your EU261 assessment now.
              This usually takes 15–30 seconds.
            </p>
          </>
        )}

        {status === 'found' && certId && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-green-600 text-3xl">✓</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Certification Complete</h1>
            <p className="text-gray-500 text-sm">Redirecting to your certificate...</p>
          </>
        )}

        {status === 'not_found' && (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-yellow-600 text-3xl">!</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Taking Longer Than Expected</h1>
            <p className="text-gray-500 text-sm mb-4">
              Your payment was received. If your certification doesn&apos;t appear within a few minutes,
              check your email for the certificate link.
            </p>
            <a href="/" className="btn-secondary text-sm">
              Return Home
            </a>
          </>
        )}
      </div>
    </main>
  )
}

export default function PendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PendingContent />
    </Suspense>
  )
}
