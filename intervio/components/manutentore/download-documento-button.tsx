'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function DownloadDocumentoButton({ filePath, fileName }: { filePath: string; fileName: string }) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.storage.from('documenti').createSignedUrl(filePath, 60)
    if (data?.signedUrl) {
      const link = document.createElement('a')
      link.href = data.signedUrl
      link.download = fileName
      link.click()
    }
    setLoading(false)
  }

  return (
    <Button variant="ghost" size="sm" onClick={download} loading={loading}>
      ↓ Scarica
    </Button>
  )
}
