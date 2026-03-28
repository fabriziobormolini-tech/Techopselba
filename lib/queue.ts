/**
 * BullMQ queue setup for async certification processing.
 * Falls back gracefully if Redis is not available.
 */

import { Queue, Worker, type Job } from 'bullmq'
import { createCertification } from '@/lib/certification'
import type { CertificationPayload } from '@/types'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

let certificationQueue: Queue | null = null

function getQueue(): Queue | null {
  if (!process.env.REDIS_URL) return null

  if (!certificationQueue) {
    certificationQueue = new Queue('certifications', {
      connection: { url: REDIS_URL },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 500 },
      },
    })
  }
  return certificationQueue
}

export async function enqueueCertification(payload: CertificationPayload): Promise<string> {
  const queue = getQueue()

  if (!queue) {
    // Synchronous fallback if Redis is not available
    const result = await createCertification(payload)
    return result.cert.id
  }

  const job = await queue.add('certify', payload)
  return job.id ?? ''
}

/**
 * Start the certification worker.
 * Call this from a separate worker process in production.
 */
export function startWorker() {
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not set — worker not started.')
    return null
  }

  const worker = new Worker<CertificationPayload>(
    'certifications',
    async (job: Job<CertificationPayload>) => {
      console.log(`Processing certification job ${job.id}`)
      const result = await createCertification(job.data)
      return { certificationId: result.cert.id, status: result.cert.status }
    },
    { connection: { url: REDIS_URL }, concurrency: 5 }
  )

  worker.on('completed', (job) => {
    console.log(`Certification job ${job.id} completed.`)
  })

  worker.on('failed', (job, err) => {
    console.error(`Certification job ${job?.id} failed:`, err.message)
  })

  return worker
}
