# Intervio — System Design

## 1. Visione architetturale

Intervio è un **aggregation layer**, non un sistema monolitico verticale. Il suo compito è:

1. Fornire il **fascicolo digitale** di ogni impianto come fonte di verità
2. Esporre **viste differenziate** per ogni attore tramite link QR
3. **Integrare** — non sostituire — i software verticali esistenti
4. Garantire **tracciabilità** di ogni documento, intervento e cambio di stato

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INTERVIO PLATFORM                          │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐    │
│  │  QR Gateway  │   │  Auth Layer  │   │  Notification Engine │    │
│  └──────┬───────┘   └──────┬───────┘   └──────────────────────┘    │
│         │                  │                                        │
│  ┌──────▼──────────────────▼──────────────────────────────────┐    │
│  │                    Core Domain Services                     │    │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────────────┐  │    │
│  │  │  Fascicolo │ │  Interventi  │ │  Conformità /        │  │    │
│  │  │  Impianto  │ │  & Documenti │ │  Scadenze            │  │    │
│  │  └────────────┘ └──────────────┘ └──────────────────────┘  │    │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────────────┐  │    │
│  │  │  Anagrafici│ │  Preventivi  │ │  Firma Digitale      │  │    │
│  │  │  & Edifici │ │  & Approvaz. │ │  & DDT               │  │    │
│  │  └────────────┘ └──────────────┘ └──────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Integration Bus                          │    │
│  │  REST API │ Webhook Receiver │ Adapter Layer │ Event Queue  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
 ┌──────▼──────┐          ┌──────▼──────┐         ┌──────▼──────┐
 │  FSM esterni│          │ Gestionali  │         │  Certificaz.│
 │  Mainsim    │          │ Domustudio  │         │  Certifico  │
 │  Fieldd     │          │ Gecoplus    │         │  INAIL API  │
 │  ecc.       │          │ Buildium    │         │  VVF        │
 └─────────────┘          └─────────────┘         └─────────────┘
```

---

## 2. Componenti principali

### 2.1 QR Gateway

Ogni impianto ha un URL univoco del tipo:

```
https://intervio.app/i/{impianto_uuid}
```

Il QR Gateway:
- Risolve l'`impianto_uuid` → determina l'impianto
- Legge il contesto dell'attore (token JWT / sessione / link condiviso)
- Reindirizza alla **vista appropriata** in base al ruolo:
  - `/m/{uuid}` → Manutentore
  - `/a/{uuid}` → Amministratore
  - `/c/{uuid}` → Condomino
  - `/v/{uuid}` → Ente di controllo (view-only, link firmato)

Il QR fisico può puntare all'URL base senza token; l'autenticazione avviene dopo la scansione. Per gli enti di controllo esiste la modalità **link firmato con scadenza** (nessun account richiesto).

### 2.2 Auth Layer

| Modalità | Attore | Meccanismo |
|---|---|---|
| Account con ruolo | Manutentore, Amministratore | Email/password + MFA, JWT con claim di ruolo e perimetro |
| Account condomino | Condomino | Invito via email o SMS, accesso con magic link o password |
| Link firmato | Ente di controllo | URL HMAC-signed con scadenza configurabile (es. 30 giorni) |
| API key | Integrazioni FSM / gestionali | Header `X-Intervio-Key`, scope per tenant |

**Perimetro di autorizzazione**: ogni token è associato a un set di `edificio_id` e/o `impianto_id`. Un manutentore vede solo i propri clienti; un amministratore solo i propri edifici; un condomino solo le unità di cui è intestatario.

### 2.3 Fascicolo Digitale dell'Impianto

È l'entità centrale del dominio. Contiene:

- **Anagrafica impianto**: tipo, marca, modello, matricola, data installazione, ubicazione
- **Documenti**: certificati, libretti, verbali, fotografie, DICO, rapporti di verifica
- **Storico interventi**: ordinari, straordinari, verifiche obbligatorie
- **Stato di conformità**: semaforo (conforme / in scadenza / scaduto) per ogni normativa applicabile
- **Scadenze**: calcolate automaticamente o impostate manualmente
- **Catena di custodia**: chi ha caricato cosa e quando (audit trail immutabile)

### 2.4 Notification Engine

Gestione asincrona delle notifiche, configurabile per:
- **Canale**: email, SMS, push (PWA), webhook verso sistemi terzi
- **Tipo evento**: scadenza imminente, intervento completato, preventivo ricevuto, documento caricato, cambio stato conformità
- **Routing per tipo di impianto**: l'amministratore può configurare routing diverso per ascensori vs impianto antincendio vs caldaia

```
Evento → Event Bus → Notification Router → [Email | SMS | Push | Webhook]
                           │
                    Regole configurate
                    per edificio/tipo
```

### 2.5 Integration Bus

Architettura event-driven con due modalità:

**Push (Webhook Receiver)**
- I sistemi esterni inviano eventi ad Intervio
- Intervio espone endpoint normalizzati
- Adapter layer per ogni sistema sorgente (Mainsim, Domustudio, ecc.)

**Pull (Polling / Scheduled Sync)**
- Per sistemi che non supportano webhook
- Job schedulato che chiama API del sistema esterno
- Normalizzazione + deduplicazione + upsert nel fascicolo

**Event Queue** (es. RabbitMQ / SQS)
- Disaccoppia la ricezione dal processamento
- Garantisce ordine e at-least-once delivery
- Dead-letter queue per eventi non processabili

---

## 3. Viste per attore

### 3.1 Manutentore / Azienda

**Modulo interno (default, se no FSM esterno)**

```
Dashboard Manutentore
├── Clienti (edifici assegnati)
│   ├── Anagrafica edificio + condominio
│   └── Lista impianti con stato conformità
├── Interventi
│   ├── Pianificati / In corso / Completati
│   ├── Creazione ordine di lavoro
│   ├── Firma digitale sul campo (mobile)
│   └── Caricamento documenti post-intervento
├── Magazzino
│   ├── Ricambi e materiali
│   └── Movimentazione (entrata/uscita)
├── DDT e Fatturazione
│   ├── Generazione DDT
│   ├── Preventivi
│   └── Fatture (integrazione con software contabile)
└── Impostazioni integrazione
    └── FSM esterno (se configurato, bypassa modulo interno)
```

**Modalità bypass FSM esterno**
- Configurazione webhook/API key per il FSM scelto
- Mappatura campi: entity del FSM → entità Intervio
- Il modulo interno viene nascosto dalla UI
- I dati degli interventi arrivano automaticamente e alimentano il fascicolo

### 3.2 Amministratore di Condominio

```
Dashboard Amministratore
├── Overview multi-edificio
│   ├── Mappa o lista edifici gestiti
│   └── KPI: impianti scaduti, in scadenza, conformi
├── Per edificio
│   ├── Lista impianti con semaforo conformità
│   ├── Scadenze normative (timeline)
│   ├── Documenti edificio
│   └── Configurazione notifiche per tipo impianto
├── Richieste di intervento
│   ├── In entrata dai condomini
│   ├── Smistamento al manutentore
│   └── Tracking stato
├── Preventivi
│   ├── Ricezione da manutentore
│   └── Approvazione / Rifiuto con note
└── Integrazione gestionale
    └── Sync bidirezionale anagrafica (Domustudio / Gecoplus / Buildium)
```

### 3.3 Condomino / Proprietario

UI mobile-first (PWA, nessuna installazione richiesta).

```
Home Condomino
├── I miei impianti (per unità di proprietà)
│   ├── Stato sintetico (conforme / attenzione)
│   └── Documenti accessibili (certificati, libretti)
├── Richieste intervento
│   ├── Nuova richiesta (testo + foto)
│   └── Tracking con notifiche push
└── Notifiche
    └── Aggiornamenti su richieste aperte
```

### 3.4 Ente di Controllo / Verificatore

Accesso via link firmato, nessun account richiesto.

```
Vista Ente di Controllo (read-only)
├── Fascicolo impianto
│   ├── Anagrafica completa
│   ├── Stato conformità per normativa (semaforo)
│   ├── Documenti (scaricabili)
│   └── Storico interventi
└── (Multi-impianto se l'accesso è configurato per più impianti)
```

---

## 4. Pattern di integrazione

### 4.1 FSM esterni (Mainsim, Fieldd, ecc.)

```
FSM → [Webhook POST /integrations/fsm/{adapter}] → Normalizer → Event Queue
                                                                      │
                                                              Fascicolo Updater
                                                                      │
                                                            Fascicolo Impianto
```

Dati sincronizzati: interventi completati, tecnici assegnati, documenti allegati, stati ordine di lavoro.

### 4.2 Gestionali condominio (Domustudio, Gecoplus, Buildium)

Sync bidirezionale per anagrafiche:

```
Gestionale ──push──► Intervio    (anagrafica edificio, unità, proprietari)
Intervio   ──push──► Gestionale  (richieste intervento, stati conformità)
```

Formato scambio preferito: REST + JSON. Per sistemi legacy: file CSV/XML con import schedulato.

### 4.3 Enti certificatori e verificatori

- **INAIL** (ascensori): ricezione verbali di verifica periodica via API o upload manuale
- **VVF** (antincendio): upload CPI, verbali ispezione
- **ASL**: certificazioni sanitarie (es. impianti idrici, Legionella)
- **Ispettori energetici**: APE, libretti impianto termico

In assenza di API ufficiali: upload manuale da parte del manutentore o del verificatore tramite link firmato temporaneo.

---

## 5. Stack tecnologico (raccomandato)

| Layer | Tecnologia | Motivazione |
|---|---|---|
| Frontend Web | Next.js (React) | SSR per SEO, PWA per mobile-first condomino |
| Mobile (manutentore sul campo) | React Native o PWA | Firma digitale, camera, offline-first |
| Backend API | Node.js (Fastify) o Python (FastAPI) | Performance, ecosystem integrazioni |
| Database principale | PostgreSQL | Relazionale, JSONB per documenti flessibili |
| Storage documenti | S3-compatible (AWS S3 / MinIO) | PDF, foto, certificati |
| Event Queue | RabbitMQ o AWS SQS | Integrazione asincrona |
| Cache | Redis | Sessioni, rate limiting, dati frequenti |
| Auth | Auth0 o Keycloak o custom JWT | Multi-tenant, ruoli, link firmati |
| Notifiche push | Firebase FCM / Web Push | PWA e app native |
| Email/SMS | SendGrid + Twilio | Notifiche transazionali |
| Infrastructure | Docker + Kubernetes o AWS ECS | Scalabilità, multi-tenant isolation |

---

## 6. Considerazioni di sicurezza

### Multi-tenancy
- Isolamento dati a livello di `tenant_id` su ogni query
- Row-level security (RLS) su PostgreSQL
- API key con scope limitato al tenant

### Documenti sensibili
- Storage con accesso pre-signed URL (scadenza breve, es. 15 min)
- Nessun documento accessibile senza autenticazione (tranne link firmati per enti)
- Audit trail immutabile per ogni accesso a documento

### Link firmati per enti di controllo
- HMAC-SHA256 con secret per tenant
- Payload: `{impianto_id, scadenza, scope_read_only}`
- Revocabili dall'amministratore in qualsiasi momento

### GDPR
- Dati personali condomini/proprietari: consenso esplicito al momento dell'invito
- Diritto alla cancellazione: procedura di anonimizzazione (non cancellazione fisica per integrità audit trail)
- Log accessi conservati per 12 mesi

---

## 7. Scalabilità e multi-tenant

Architettura **multi-tenant con database condiviso + schema separato per tenant** (o RLS):

```
tenant_id: uuid  →  ogni entità del dominio porta il tenant_id
                     RLS PostgreSQL garantisce isolamento
                     API layer verifica sempre tenant dal token
```

**Tier di servizio** (per futuro):
- **Starter**: fino a N impianti, senza integrazioni FSM esterne
- **Professional**: impianti illimitati, 1 integrazione FSM
- **Enterprise**: multi-sede, integrazioni multiple, SLA, white-label

---

## 8. Flussi principali (Happy Path)

### 8.1 Primo setup impianto

```
Manutentore crea impianto → Sistema genera UUID + QR →
Stampa etichetta QR → Applicazione fisica sull'impianto →
Caricamento documenti iniziali (libretto, certificato) →
Fascicolo attivo
```

### 8.2 Intervento di manutenzione ordinaria

```
Pianificazione (automatica da scadenza o manuale) →
Notifica manutentore → Esecuzione intervento →
Firma digitale sul campo → Caricamento report/foto →
Aggiornamento stato conformità → Notifica amministratore →
(Opzionale) Notifica condomino
```

### 8.3 Richiesta intervento da condomino

```
Condomino scansiona QR o apre app →
Invia richiesta (testo + foto) →
Notifica amministratore →
Amministratore smista al manutentore →
Manutentore crea ordine di lavoro →
Esecuzione → Chiusura → Notifica condomino
```

### 8.4 Verifica ente di controllo

```
Amministratore genera link firmato per impianto specifico →
Invia link all'ente →
Ente accede senza account →
Visualizza fascicolo in sola lettura →
(Opzionale) Scarica documenti →
Link scade automaticamente
```
