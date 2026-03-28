'use client'

import { useEffect, useRef } from 'react'

interface QRCodeDisplayProps {
  url: string
  size?: number
}

export function QRCodeDisplay({ url, size = 180 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    async function render() {
      if (!canvasRef.current) return
      const QRCode = (await import('qrcode')).default
      await QRCode.toCanvas(canvasRef.current, url, {
        width: size,
        margin: 2,
        color: { dark: '#1e3a5f', light: '#ffffff' },
      })
    }
    render()
  }, [url, size])

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'qr-intervio.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded-lg border border-gray-200" />
      <button
        onClick={handleDownload}
        className="text-xs text-blue-600 hover:underline"
      >
        Scarica PNG
      </button>
    </div>
  )
}
