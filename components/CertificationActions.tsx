'use client'

import { useState } from 'react'

interface Props {
  certId: string
}

export default function CertificationActions({ certId }: Props) {
  const [copied, setCopied] = useState(false)

  const certUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/cert/${certId}`
      : `/cert/${certId}`

  const copy = async () => {
    await navigator.clipboard.writeText(certUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-4">Share This Certificate</h3>
      <div className="flex items-center gap-2 mb-4">
        <input
          readOnly
          value={certUrl}
          className="input text-xs text-gray-500 bg-gray-50"
        />
        <button onClick={copy} className="btn-secondary text-xs whitespace-nowrap py-2.5">
          {copied ? 'Copied!' : 'Copy URL'}
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => window.print()}
          className="btn-secondary text-xs py-2 px-3"
        >
          Print / Save PDF
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `I've certified my flight compensation claim with @Techopselba. Airlines should pay. ${certUrl}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-xs py-2 px-3"
        >
          Share on X
        </a>
        <a
          href={`mailto:?subject=My%20EU261%20Flight%20Claim%20Certificate&body=I%20have%20an%20independently%20certified%20flight%20claim%20under%20EU%20Regulation%20261%2F2004.%0A%0ACertificate%3A%20${encodeURIComponent(certUrl)}`}
          className="btn-secondary text-xs py-2 px-3"
        >
          Share via Email
        </a>
      </div>
      <p className="text-xs text-gray-400 mt-3">
        Send this link to the airline&apos;s customer service team, ENAC, or your lawyer.
        The certificate is permanently accessible at this URL.
      </p>
    </div>
  )
}
