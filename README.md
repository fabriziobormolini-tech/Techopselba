# Techopselba — Flight Claim Certification Platform

Independent certification authority for EU261/2004 flight compensation claims.

## The Problem

Airlines ignore 40% of valid EU261 claims because there is no enforcement. ENAC (Italy's regulator) is understaffed at 100 people handling 50,000 complaints/year. Existing claims services (AirHelp, etc.) only reduce friction — they don't change the airline's incentive to pay.

## The Solution

We create social pressure as an enforcement mechanism:

1. Passenger uploads documents
2. We certify validity (AI + rules engine)
3. Public, blockchain-anchored certificate issued
4. Database tracks airline compliance rates
5. Media/regulators/lawyers cite our data
6. Airlines pay certified claims faster to protect reputation

## Phase 1 MVP Features

- **Document OCR** — Google Cloud Vision extracts boarding pass data automatically
- **EU261 Rules Engine** — Distance-based compensation calculation with extraordinary circumstances detection
- **Certification Database** — PostgreSQL via Prisma, hashed passenger emails for privacy
- **Public Certificate Pages** — Permanent URLs, blockchain hash, shareable/printable
- **Airline Compliance Dashboard** — Real-time rankings of which airlines pay and which don't
- **Stripe Payment** — €25 per certification, webhook-triggered processing
- **Feedback Loop** — Passengers report outcomes; feeds the compliance database
- **Public API** — `GET /api/airlines/:code` for journalists and B2B consumers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Prisma (Supabase recommended) |
| Queue | BullMQ + Redis |
| OCR | Google Cloud Vision API |
| Payment | Stripe Checkout + Webhooks |
| Storage | AWS S3 (document storage) |
| Hosting | Vercel (frontend) + Railway (worker) |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Fill in your API keys
```

### 3. Set up the database

```bash
# Push schema to your PostgreSQL database
npm run db:push

# Seed with sample airlines and certifications
npm run db:generate
npx ts-node prisma/seed.ts
```

### 4. Run development server

```bash
npm run dev
```

### 5. (Optional) Run the queue worker

```bash
# In a separate terminal, with REDIS_URL set
npx ts-node worker.ts
```

## Environment Variables

See `.env.example` for all required variables.

**Minimum required for local development:**
- `DATABASE_URL` — PostgreSQL connection string
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — Stripe keys
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key
- `NEXT_PUBLIC_APP_URL` — Your app URL (e.g. `http://localhost:3000`)

**For full OCR functionality:**
- `GOOGLE_CLOUD_API_KEY` — Google Cloud Vision API key

## API Reference

### Eligibility Check (no payment required)

```
GET /api/certify?flight=FR1234&date=2025-03-15&delay=4&distance=1434
```

### Airline Compliance Data

```
GET /api/airlines          # All airlines
GET /api/airlines/FR       # Single airline (Ryanair)
```

### Report Outcome (feeds compliance database)

```
POST /api/feedback
{ certificationId, outcome: "PAID_FULL"|"PAID_PARTIAL"|"DENIED"|"NO_RESPONSE", daysToPay? }
```

## EU261 Compensation Tiers

| Distance | Compensation |
|----------|-------------|
| < 1,500 km | €250 |
| 1,500 – 3,500 km | €400 |
| > 3,500 km | €600 (€300 if delay < 4h) |

Minimum delay threshold: **3 hours** at arrival.

## Architecture

```
Browser -> Next.js (Vercel)
             |
             +-- /api/checkout    -> Stripe Checkout
             +-- /api/webhook     -> Stripe Webhook -> createCertification
             +-- /api/certify     -> EU261 Rules Engine
             +-- /api/airlines    -> Compliance DB
             +-- /api/ocr         -> Google Vision API
             +-- /api/feedback    -> Outcome tracking
             |
         PostgreSQL (Supabase)
         Redis + BullMQ (async queue)
         AWS S3 (document storage)
```

## Traction (Beta, April 2026)

- 75 certifications completed (manual beta)
- 94% accuracy vs actual airline payment behaviour
- 1,200 EUR revenue (20 EUR/cert since March)
- 68% conversion rate
- 2 Italian travel blog features, 1 NGO partnership in progress
