/**
 * BullMQ Worker Process
 *
 * Run separately in production:
 *   npx ts-node worker.ts
 * Or via Railway/Render worker process.
 */

import { startWorker } from '@/lib/queue'

const worker = startWorker()

if (worker) {
  console.log('Certification worker started.')
  process.on('SIGTERM', async () => {
    await worker.close()
    process.exit(0)
  })
} else {
  console.warn('Worker not started — REDIS_URL not set.')
  process.exit(0)
}
