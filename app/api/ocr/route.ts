import { NextRequest, NextResponse } from 'next/server'
import { processDocument } from '@/lib/ocr'

export const config = { api: { bodyParser: false } }

/**
 * POST /api/ocr
 * Accepts a multipart form with a document file.
 * Returns extracted flight data.
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const documentType = (formData.get('type') as string) ?? 'BOARDING_PASS'

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'File must be JPEG, PNG, WebP, or PDF' },
      { status: 400 }
    )
  }

  // 10 MB limit
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await processDocument(
    buffer,
    documentType as 'BOARDING_PASS' | 'BOOKING_CONFIRMATION',
    file.type
  )

  return NextResponse.json(result)
}
