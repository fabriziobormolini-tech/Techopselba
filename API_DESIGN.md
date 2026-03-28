# Intervio — API Design

## Convenzioni generali

- **Base URL**: `https://api.intervio.app/v1`
- **Formato**: JSON, `Content-Type: application/json`
- **Autenticazione**: `Authorization: Bearer <jwt>` oppure `X-Intervio-Key: <api_key>`
- **Paginazione**: cursor-based — `?cursor=<opaque_cursor>&limit=50`
- **Errori**: RFC 7807 Problem Details

```json
{
  "type": "https://api.intervio.app/errors/not-found",
  "title": "Risorsa non trovata",
  "status": 404,
  "detail": "Impianto con ID 'xyz' non trovato",
  "instance": "/v1/impianti/xyz"
}
```

- **Versioning**: path-based (`/v1/`, `/v2/`)
- **Rate limiting**: header `X-RateLimit-Remaining` / `X-RateLimit-Reset`
- **Tenant isolation**: il `tenant_id` è ricavato automaticamente dal token JWT — mai passato nella request

---

## Autenticazione

### POST /auth/login
Login con email e password.

```json
// Request
{ "email": "mario@example.com", "password": "..." }

// Response 200
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_in": 3600,
  "utente": { "id": "uuid", "ruolo": "manutentore", "nome": "Mario Rossi" }
}
```

### POST /auth/refresh
Rinnova access token.

```json
// Request
{ "refresh_token": "eyJ..." }
```

### POST /auth/magic-link
Invia magic link a un condomino (chiamata da admin/manutentore).

```json
// Request
{ "email": "condomino@example.com", "utente_id": "uuid" }
```

### GET /auth/qr/{impianto_uuid}
Risolve un QR scan: restituisce il redirect URL appropriato in base al ruolo del token corrente. Se nessun token, restituisce URL di login con `redirect_after`.

```json
// Response 200
{
  "redirect_url": "https://app.intervio.app/m/fascicolo/{impianto_id}",
  "ruolo_attore": "manutentore",
  "impianto_id": "uuid"
}
```

---

## Edifici

### GET /edifici
Lista edifici del tenant autenticato.

**Query params**: `?search=`, `?stato_conformita=conforme|in_scadenza|scaduto`

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "nome": "Condominio Rossi",
      "indirizzo": "Via Roma 10, 20100 Milano",
      "n_impianti": 4,
      "impianti_scaduti": 1,
      "impianti_in_scadenza": 2,
      "impianti_conformi": 1
    }
  ],
  "cursor_next": "opaque_cursor_string"
}
```

### POST /edifici
Crea nuovo edificio.

```json
// Request
{
  "nome": "Condominio Verdi",
  "indirizzo_via": "Via Garibaldi",
  "indirizzo_civico": "5",
  "indirizzo_cap": "20100",
  "indirizzo_comune": "Milano",
  "indirizzo_provincia": "MI",
  "amministratore_id": "uuid"
}
```

### GET /edifici/{id}
Dettaglio edificio con lista impianti e KPI.

### PATCH /edifici/{id}
Aggiorna campi edificio.

### DELETE /edifici/{id}
Elimina edificio (soft delete, richiede ruolo admin).

---

## Impianti

### GET /edifici/{edificio_id}/impianti
Lista impianti di un edificio.

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "qr_code_uuid": "uuid",
      "qr_url": "https://intervio.app/i/{qr_code_uuid}",
      "tipo_impianto": "ascensore",
      "marca": "Otis",
      "modello": "Gen2",
      "ubicazione": "Scala A",
      "stato_conformita": "in_scadenza",
      "prossima_scadenza": { "data": "2024-06-15", "tipo": "verifica_periodica" }
    }
  ]
}
```

### POST /edifici/{edificio_id}/impianti
Crea impianto e genera QR code UUID.

```json
// Request
{
  "tipo_impianto": "ascensore",
  "marca": "Otis",
  "modello": "Gen2",
  "matricola": "IT-MI-12345",
  "ubicazione": "Scala A, piano -1"
}

// Response 201
{
  "id": "uuid",
  "qr_code_uuid": "uuid",
  "qr_url": "https://intervio.app/i/{qr_code_uuid}",
  "qr_image_url": "https://api.intervio.app/v1/impianti/{id}/qr.png"
}
```

### GET /impianti/{id}
Fascicolo completo dell'impianto.

```json
// Response 200
{
  "impianto": { /* anagrafica */ },
  "fascicolo": {
    "stato_conformita": "in_scadenza",
    "ultimo_intervento_at": "2024-01-15T10:00:00Z",
    "prossima_scadenza_at": "2024-06-15",
    "prossima_scadenza_tipo": "verifica_periodica"
  },
  "scadenze": [ /* ultime 5 */ ],
  "interventi_recenti": [ /* ultimi 5 */ ],
  "documenti_recenti": [ /* ultimi 5 */ ]
}
```

### GET /impianti/{id}/qr.png
Restituisce l'immagine PNG del QR code (Content-Type: image/png).

Query params: `?size=300` (pixel, default 300)

### PATCH /impianti/{id}
Aggiorna anagrafica impianto.

---

## Documenti

### GET /impianti/{impianto_id}/documenti
Lista documenti del fascicolo.

**Query params**: `?tipo=certificato|verbale|libretto|...`, `?visibile_condomino=true`

```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "tipo": "certificato",
      "titolo": "Certificato verifica periodica 2024",
      "file_nome_originale": "cert_2024.pdf",
      "file_dimensione_kb": 245,
      "caricato_il": "2024-01-15T10:00:00Z",
      "caricato_da": { "nome": "Mario Rossi" },
      "download_url": "https://..."  // pre-signed URL, scade in 15 min
    }
  ]
}
```

### POST /impianti/{impianto_id}/documenti
Upload documento. Usa multipart/form-data.

```
POST /v1/impianti/{id}/documenti
Content-Type: multipart/form-data

Fields:
  tipo: "certificato"
  titolo: "Verbale verifica INAIL"
  visibile_condomino: false
  visibile_ente: true
  intervento_id: "uuid" (opzionale)
  file: <binary>
```

### GET /documenti/{id}
Metadati documento + pre-signed download URL.

### DELETE /documenti/{id}
Elimina documento (soft delete + audit log).

---

## Interventi

### GET /impianti/{impianto_id}/interventi
Storico interventi impianto.

**Query params**: `?stato=completato|pianificato|...`, `?dal=2024-01-01&al=2024-12-31`

### POST /impianti/{impianto_id}/interventi
Crea nuovo intervento.

```json
// Request
{
  "tipo": "verifica",
  "titolo": "Verifica periodica INAIL",
  "pianificato_il": "2024-06-10T09:00:00Z",
  "tecnico_id": "uuid",
  "scadenza_collegata": "uuid",
  "note": "Portare documentazione precedente"
}
```

### PATCH /interventi/{id}
Aggiorna intervento (inclusa chiusura con firma).

```json
// Chiusura intervento
{
  "stato": "completato",
  "completato_il": "2024-06-10T11:30:00Z",
  "note_completamento": "Verifica eseguita, nessuna anomalia",
  "firma_digitale_url": "https://storage/.../firma.png"
}
```

### GET /interventi/{id}
Dettaglio intervento con documenti allegati.

---

## Scadenze

### GET /impianti/{impianto_id}/scadenze
Scadenze dell'impianto.

### POST /impianti/{impianto_id}/scadenze
Crea scadenza (automatica o manuale).

```json
{
  "tipo": "verifica_periodica",
  "normativa_rif": "DPR 162/99 art.13",
  "ente_competente": "INAIL",
  "data_scadenza": "2024-06-15",
  "giorni_preavviso": 60
}
```

### PATCH /scadenze/{id}
Aggiorna stato scadenza (es. completata, prorogata).

---

## Richieste Intervento (Condomino)

### POST /edifici/{edificio_id}/richieste
Invia richiesta intervento.

```json
// Request (condomino autenticato)
{
  "impianto_id": "uuid",  // opzionale — può essere generico
  "titolo": "Ascensore bloccato al piano 3",
  "descrizione": "Da stamattina l'ascensore non funziona",
  "urgenza": "urgente"
}
// Allegati foto: multipart upload separato
```

### GET /edifici/{edificio_id}/richieste
Lista richieste. Filtri per ruolo:
- Condomino: vede solo le proprie
- Admin/Manutentore: vede tutte dell'edificio

### PATCH /richieste/{id}
Aggiorna stato richiesta (admin/manutentore).

```json
{
  "stato": "presa_in_carico",
  "note_admin": "Stiamo contattando il manutentore"
}
```

---

## Preventivi

### POST /richieste/{richiesta_id}/preventivi
Emetti preventivo per una richiesta.

```json
{
  "importo_netto": 450.00,
  "importo_iva": 99.00,
  "importo_totale": 549.00,
  "valido_fino": "2024-03-31",
  "note": "Inclusa manodopera e ricambi"
}
```

### PATCH /preventivi/{id}/risposta
Risposta del condomino/amministratore.

```json
{
  "stato": "approvato",  // approvato | rifiutato
  "note": "Approvato, procedere appena possibile"
}
```

---

## Link Accesso Firmato (Ente di Controllo)

### POST /link-accesso-firmati
Crea link per ente di controllo. Richiede ruolo amministratore o manutentore.

```json
// Request
{
  "impianto_ids": ["uuid1", "uuid2"],
  "descrizione": "Verifica INAIL 2024 - Ascensore Scala A",
  "scade_il": "2024-07-31T23:59:59Z"
}

// Response 201
{
  "id": "uuid",
  "link": "https://intervio.app/v/{token}",
  "scade_il": "2024-07-31T23:59:59Z"
}
```

### GET /link-accesso-firmati
Lista link creati dal tenant. Include stato (attivo/scaduto/revocato).

### DELETE /link-accesso-firmati/{id}
Revoca link.

### GET /v/{token} (public endpoint, no auth)
Accesso fascicolo per ente di controllo. Valida firma HMAC, verifica scadenza, restituisce fascicoli impianti configurati in sola lettura.

---

## Notifiche

### GET /notifiche
Lista notifiche dell'utente autenticato.

**Query params**: `?stato=pending|letta`, `?limit=20`

### PATCH /notifiche/{id}/letta
Marca notifica come letta.

### GET /notifiche/impostazioni
Configurazione notifiche per l'utente/tenant.

### PUT /notifiche/impostazioni
Aggiorna configurazione.

```json
{
  "impianto_tipo": "ascensore",
  "eventi": {
    "scadenza_imminente": { "email": true, "sms": false, "push": true },
    "intervento_completato": { "email": true, "sms": false, "push": false }
  }
}
```

---

## Integrazioni — Webhook Receiver

### POST /integrations/fsm/{adapter}
Ricezione eventi da FSM esterni. `adapter` ∈ `mainsim | fieldd | custom`.

Header richiesto: `X-Intervio-Key: <api_key>` + `X-Signature: HMAC-SHA256` del body.

```json
// Esempio payload da Mainsim (normalizzato dall'adapter)
{
  "event_type": "work_order.completed",
  "external_id": "WO-12345",
  "impianto_matricola": "IT-MI-12345",  // chiave di correlazione
  "tecnico_nome": "Luigi Bianchi",
  "completato_il": "2024-06-10T11:30:00Z",
  "note": "...",
  "documenti": [
    { "tipo": "rapporto", "url": "https://mainsim.com/docs/..." }
  ]
}
```

Response: `202 Accepted` (processamento asincrono).

### POST /integrations/gestionale/{adapter}
Sync anagrafica da gestionale condominio. `adapter` ∈ `domustudio | gecoplus | buildium`.

```json
{
  "event_type": "condomino.updated",
  "external_id": "COND-001",
  "edificio_codice_fiscale": "12345678901",
  "nome": "Mario Rossi",
  "email": "mario@example.com",
  "unita": "Scala A Int.3"
}
```

### GET /integrations/status
Stato delle integrazioni configurate per il tenant.

```json
{
  "fsm": { "tipo": "mainsim", "ultimo_evento": "2024-06-10T11:30:00Z", "stato": "ok" },
  "gestionale": { "tipo": "domustudio", "ultimo_sync": "2024-06-10T08:00:00Z", "stato": "ok" }
}
```

---

## Dashboard & Reporting

### GET /dashboard/amministratore
KPI aggregati per l'amministratore.

```json
{
  "edifici_gestiti": 5,
  "impianti_totali": 23,
  "impianti_scaduti": 2,
  "impianti_in_scadenza_30gg": 4,
  "impianti_conformi": 17,
  "richieste_aperte": 3,
  "preventivi_in_attesa": 1,
  "scadenze_prossime_30gg": [
    {
      "impianto_id": "uuid",
      "impianto_tipo": "ascensore",
      "edificio": "Condominio Rossi",
      "data_scadenza": "2024-06-15",
      "tipo": "verifica_periodica",
      "ente": "INAIL"
    }
  ]
}
```

### GET /dashboard/manutentore
KPI per l'azienda manutentrice.

```json
{
  "clienti_attivi": 12,
  "interventi_in_corso": 3,
  "interventi_pianificati_7gg": 8,
  "impianti_scaduti_gestiti": 2
}
```

---

## Webhooks in uscita (Outbound)

Intervio può notificare sistemi esterni su eventi del dominio.

### PUT /webhooks
Configura endpoint outbound.

```json
{
  "url": "https://external-system.com/intervio-events",
  "secret": "whsec_...",
  "eventi": [
    "intervento.completato",
    "conformita.cambiata",
    "documento.caricato",
    "richiesta.inviata"
  ]
}
```

**Payload outbound (esempio)**:

```json
{
  "id": "evt_uuid",
  "tipo": "intervento.completato",
  "timestamp": "2024-06-10T11:30:00Z",
  "tenant_id": "uuid",
  "data": {
    "intervento_id": "uuid",
    "impianto_id": "uuid",
    "impianto_tipo": "ascensore",
    "edificio_id": "uuid"
  }
}
```

Header: `X-Intervio-Signature: HMAC-SHA256` del body con il secret configurato.

---

## Permessi per ruolo — riepilogo

| Endpoint | Manutentore | Amministratore | Condomino | Ente (link) |
|---|:---:|:---:|:---:|:---:|
| GET /impianti/{id} | ✅ | ✅ | ✅ (solo propri) | ✅ (read) |
| POST /impianti | ✅ | ❌ | ❌ | ❌ |
| GET /documenti | ✅ | ✅ | ✅ (se visibile) | ✅ (read) |
| POST /documenti | ✅ | ❌ | ❌ | ❌ |
| POST /interventi | ✅ | ❌ | ❌ | ❌ |
| GET /interventi | ✅ | ✅ | ❌ | ✅ (read) |
| POST /richieste | ❌ | ❌ | ✅ | ❌ |
| GET /richieste | ✅ | ✅ | ✅ (solo proprie) | ❌ |
| POST /link-accesso-firmati | ✅ | ✅ | ❌ | ❌ |
| GET /dashboard/amministratore | ❌ | ✅ | ❌ | ❌ |
| POST /integrations/* | sistema | sistema | ❌ | ❌ |
