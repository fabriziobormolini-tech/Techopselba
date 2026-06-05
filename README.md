# Wayrd

**Flight monitoring & guest messaging platform for hotels.**

Wayrd monitora i voli in arrivo degli ospiti di un hotel e, su WhatsApp, invia
la presa in carico, gli avvisi di ritardo/atterraggio/cancellazione all'ospite
e gli alert alla reception. Include una dashboard hotel e un backoffice admin
con pagamenti.

Stack: **Next.js 14 (App Router) + TypeScript + Prisma + Tailwind**.
Tutte le integrazioni esterne hanno un **adapter reale + un mock**: l'app gira
end-to-end senza alcuna chiave API.

---

## I 5 componenti

| # | Componente | Dove |
|---|------------|------|
| 1 | **Flight Monitoring Engine** + API voli | `src/lib/monitoring/engine.ts`, `src/lib/flights/*` |
| 2 | **Guest Data Capture** (pagina ospite) | `src/app/h/[slug]/checkin/*`, `src/app/api/checkin` |
| 3 | **Messaging Engine WhatsApp** (presa in carico + alert ospite/reception) | `src/lib/messaging/*`, `src/app/api/webhooks/whatsapp` |
| 4 | **Hotel Dashboard** (voli + storico + log messaggi) | `src/app/dashboard` |
| 5 | **Admin/backoffice + pagamenti** | `src/app/admin`, `src/lib/billing/*`, `src/app/api/webhooks/stripe` |

---

## Avvio rapido (con mock, zero chiavi)

```bash
npm install
cp .env.example .env
npm run db:reset      # crea lo schema SQLite + dati demo
npm run dev           # http://localhost:3000
```

In un altro terminale, fai "scorrere" i voli (il mock evolve nel tempo):

```bash
curl "http://localhost:3000/api/cron/poll?secret=dev-cron-secret"
# oppure
npm run poll
```

### Credenziali demo

- **Admin Wayrd:** `admin@wayrd.app` / `wayrd-admin` → `/admin`
- **Reception hotel:** `reception@demo-hotel.it` / `wayrd1234` → `/dashboard`
- **Pagina ospite demo:** `/h/demo-hotel/checkin`

I messaggi WhatsApp in modalità mock vengono stampati nel terminale del server
e registrati nel log messaggi della dashboard.

---

## Come funziona il Monitoring Engine

1. Ogni ospite registra il proprio volo dalla pagina di check-in → viene creato
   un `FlightWatch` e parte la "presa in carico" su WhatsApp.
2. Un tick periodico (`/api/cron/poll`, `npm run poll`, o "Aggiorna voli" in
   dashboard) interroga il provider voli per ogni watch attivo.
3. L'engine normalizza lo stato, registra un evento storico e decide — con
   de-duplica — quali notifiche inviare:
   - **Ritardo** oltre soglia (15') → avviso ospite + reception (ri-avviso solo
     se il ritardo cresce ≥ 20').
   - **Atterrato** → benvenuto ospite + alert reception.
   - **Cancellato** → avviso ospite + reception.
   - **Arrivo imminente** (ETA ≤ 90') → heads-up reception, una volta.

Pianifica il tick ogni 2–5 minuti (Vercel Cron, GitHub Actions, systemd timer,
k8s CronJob) chiamando `GET /api/cron/poll` con header
`Authorization: Bearer $CRON_SECRET`.

---

## Passare alle integrazioni reali

Imposta le variabili in `.env` (vedi `.env.example`); l'app passa
automaticamente dal mock all'adapter reale quando le credenziali sono presenti.

- **Voli:** `FLIGHT_PROVIDER=aerodatabox` + `AERODATABOX_API_KEY` (RapidAPI).
- **WhatsApp:** `MESSAGING_PROVIDER=whatsapp` + `WHATSAPP_ACCESS_TOKEN`,
  `WHATSAPP_PHONE_NUMBER_ID`. Webhook Meta: `…/api/webhooks/whatsapp`
  (verify token = `WHATSAPP_VERIFY_TOKEN`).
- **Pagamenti:** `BILLING_PROVIDER=stripe` + `STRIPE_SECRET_KEY`,
  `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`. Webhook: `…/api/webhooks/stripe`.

### Produzione (Postgres)

Cambia `provider` in `prisma/schema.prisma` da `sqlite` a `postgresql` e
imposta `DATABASE_URL` con la connection string Postgres, poi `npm run db:push`.

---

## Comandi

| Comando | Cosa fa |
|---------|---------|
| `npm run dev` | Avvia in sviluppo |
| `npm run build` / `start` | Build e avvio produzione |
| `npm run db:push` | Applica lo schema al DB |
| `npm run db:seed` | Inserisce i dati demo |
| `npm run db:reset` | Ricrea schema + seed |
| `npm run poll` | Esegue un tick di monitoraggio |
| `npm run typecheck` | Type-check TypeScript |
