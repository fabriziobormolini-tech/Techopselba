# Intervio — Data Model

## Schema logico

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Tenant    │────1:N──│   Edificio  │────1:N──│   Impianto  │
│  (Azienda   │         │             │         │             │
│   manutentr)│         │             │         │             │
└─────────────┘         └─────────────┘         └──────┬──────┘
                               │                       │
                               │ 1:N                   │
                        ┌──────▼──────┐         ┌──────▼──────┐
                        │   Unità     │         │  Fascicolo  │
                        │ Immobiliare │         │  Impianto   │
                        └──────┬──────┘         └──────┬──────┘
                               │ N:M                   │
                        ┌──────▼──────┐         ┌──────┼──────────────────┐
                        │  Persona /  │         │      │                  │
                        │ Proprietario│    ┌────▼────┐ ┌────▼────┐ ┌─────▼────┐
                        └─────────────┘    │Intervento│ │Documento│ │ Scadenza │
                                           └─────────┘ └─────────┘ └──────────┘
```

---

## Entità principali

### Tenant
Rappresenta l'azienda manutentrice (o la piattaforma stessa in modalità SaaS multi-tenant).

```sql
tenant (
  id              UUID PRIMARY KEY,
  nome            TEXT NOT NULL,
  partita_iva     TEXT,
  email_admin     TEXT NOT NULL,
  piano_servizio  TEXT DEFAULT 'starter',  -- starter | professional | enterprise
  created_at      TIMESTAMPTZ,
  settings        JSONB  -- configurazioni specifiche tenant
)
```

---

### Utente
Rappresenta qualsiasi attore con account registrato.

```sql
utente (
  id              UUID PRIMARY KEY,
  tenant_id       UUID REFERENCES tenant(id),
  email           TEXT UNIQUE NOT NULL,
  nome            TEXT,
  cognome         TEXT,
  telefono        TEXT,
  ruolo           TEXT NOT NULL,  -- manutentore | amministratore | condomino | tecnico
  attivo          BOOLEAN DEFAULT true,
  mfa_abilitato   BOOLEAN DEFAULT false,
  ultimo_accesso  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ
)
```

**Note**: gli enti di controllo non hanno un record `utente` — accedono tramite `link_accesso_firmato`.

---

### Edificio
Un edificio o complesso condominiale gestito.

```sql
edificio (
  id                  UUID PRIMARY KEY,
  tenant_id           UUID REFERENCES tenant(id),
  nome                TEXT NOT NULL,
  indirizzo_via       TEXT,
  indirizzo_civico    TEXT,
  indirizzo_cap       TEXT,
  indirizzo_comune    TEXT,
  indirizzo_provincia TEXT,
  codice_fiscale_cond TEXT,   -- codice fiscale del condominio
  amministratore_id   UUID REFERENCES utente(id),
  gestionale_esterno_id TEXT, -- ID nel gestionale esterno (Domustudio, ecc.)
  gestionale_tipo     TEXT,   -- domustudio | gecoplus | buildium | null
  created_at          TIMESTAMPTZ,
  metadata            JSONB
)
```

---

### Unità Immobiliare
Appartamento, ufficio, locale commerciale all'interno di un edificio.

```sql
unita_immobiliare (
  id              UUID PRIMARY KEY,
  edificio_id     UUID REFERENCES edificio(id),
  tenant_id       UUID REFERENCES tenant(id),
  piano           TEXT,
  interno         TEXT,
  descrizione     TEXT,
  created_at      TIMESTAMPTZ
)

-- Relazione proprietario/inquilino ↔ unità (N:M)
unita_persona (
  unita_id        UUID REFERENCES unita_immobiliare(id),
  persona_id      UUID REFERENCES utente(id),
  tipo_relazione  TEXT,  -- proprietario | inquilino | referente
  dal             DATE,
  al              DATE,   -- NULL = attuale
  PRIMARY KEY (unita_id, persona_id, dal)
)
```

---

### Impianto
L'oggetto fisico identificato dal QR code.

```sql
impianto (
  id                  UUID PRIMARY KEY,
  tenant_id           UUID REFERENCES tenant(id),
  edificio_id         UUID REFERENCES edificio(id),
  qr_code_uuid        UUID UNIQUE NOT NULL,  -- UUID usato nell'URL del QR
  tipo_impianto       TEXT NOT NULL,  -- ascensore | antincendio | caldaia | climatizzazione | idrico | elettrico | altro
  sottotipo           TEXT,
  marca               TEXT,
  modello             TEXT,
  matricola           TEXT,
  numero_serie        TEXT,
  anno_installazione  INTEGER,
  ubicazione          TEXT,  -- es. "piano -1, vano scala A"
  note_tecniche       TEXT,
  attivo              BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ,
  metadata            JSONB  -- dati aggiuntivi specifici per tipo impianto
)
```

---

### Fascicolo Impianto
Stato corrente e aggregato del fascicolo. È una proiezione denormalizzata per performance.

```sql
fascicolo_impianto (
  id                        UUID PRIMARY KEY,
  impianto_id               UUID UNIQUE REFERENCES impianto(id),
  tenant_id                 UUID REFERENCES tenant(id),
  stato_conformita          TEXT,  -- conforme | in_scadenza | scaduto | non_valutabile
  ultimo_intervento_at      TIMESTAMPTZ,
  prossima_scadenza_at      TIMESTAMPTZ,
  prossima_scadenza_tipo    TEXT,
  contatore_documenti       INTEGER DEFAULT 0,
  contatore_interventi      INTEGER DEFAULT 0,
  updated_at                TIMESTAMPTZ
)
```

---

### Scadenza
Scadenze normative o di manutenzione associate a un impianto.

```sql
scadenza (
  id                  UUID PRIMARY KEY,
  impianto_id         UUID REFERENCES impianto(id),
  tenant_id           UUID REFERENCES tenant(id),
  tipo                TEXT NOT NULL,  -- verifica_periodica | manutenzione_ordinaria | rinnovo_certificato | custom
  normativa_rif       TEXT,  -- es. "DPR 162/99 art.13" per ascensori
  ente_competente     TEXT,  -- INAIL | VVF | ASL | Comune | interno
  data_scadenza       DATE NOT NULL,
  data_completamento  DATE,
  stato               TEXT DEFAULT 'aperta',  -- aperta | completata | prorogata | annullata
  giorni_preavviso    INTEGER DEFAULT 30,
  note                TEXT,
  created_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES utente(id)
)
```

---

### Intervento
Un intervento tecnico (ordinario, straordinario, verifica).

```sql
intervento (
  id                  UUID PRIMARY KEY,
  impianto_id         UUID REFERENCES impianto(id),
  tenant_id           UUID REFERENCES tenant(id),
  tipo                TEXT NOT NULL,  -- ordinario | straordinario | verifica | emergenza
  titolo              TEXT NOT NULL,
  descrizione         TEXT,
  stato               TEXT DEFAULT 'pianificato',
                      -- pianificato | assegnato | in_corso | completato | annullato
  priorita            TEXT DEFAULT 'normale',  -- bassa | normale | alta | urgente
  pianificato_il      TIMESTAMPTZ,
  iniziato_il         TIMESTAMPTZ,
  completato_il       TIMESTAMPTZ,
  tecnico_id          UUID REFERENCES utente(id),
  richiesta_id        UUID REFERENCES richiesta_intervento(id),
  scadenza_collegata  UUID REFERENCES scadenza(id),
  fsm_esterno_id      TEXT,  -- ID nel FSM esterno (Mainsim, ecc.)
  note_completamento  TEXT,
  firma_digitale_url  TEXT,  -- URL firma tecnico
  created_at          TIMESTAMPTZ,
  created_by          UUID REFERENCES utente(id)
)
```

---

### Documento
Qualsiasi file allegato al fascicolo di un impianto.

```sql
documento (
  id                  UUID PRIMARY KEY,
  impianto_id         UUID REFERENCES impianto(id),
  intervento_id       UUID REFERENCES intervento(id),  -- opzionale
  tenant_id           UUID REFERENCES tenant(id),
  tipo                TEXT NOT NULL,
                      -- certificato | verbale | libretto | foto | dico | ddt
                      --   rapporto_verifica | preventivo | fattura | altro
  titolo              TEXT NOT NULL,
  descrizione         TEXT,
  file_key            TEXT NOT NULL,  -- path su S3/storage
  file_nome_originale TEXT,
  file_mime           TEXT,
  file_dimensione_kb  INTEGER,
  hash_sha256         TEXT,  -- integrità documento
  caricato_da         UUID REFERENCES utente(id),
  caricato_il         TIMESTAMPTZ DEFAULT NOW(),
  visibile_condomino  BOOLEAN DEFAULT false,
  visibile_ente       BOOLEAN DEFAULT true,
  metadata            JSONB
)
```

---

### Richiesta Intervento
Richiesta inviata da un condomino.

```sql
richiesta_intervento (
  id                  UUID PRIMARY KEY,
  impianto_id         UUID REFERENCES impianto(id),
  edificio_id         UUID REFERENCES edificio(id),
  tenant_id           UUID REFERENCES tenant(id),
  richiedente_id      UUID REFERENCES utente(id),
  titolo              TEXT NOT NULL,
  descrizione         TEXT,
  urgenza             TEXT DEFAULT 'normale',  -- normale | urgente
  stato               TEXT DEFAULT 'aperta',
                      -- aperta | presa_in_carico | in_lavorazione | chiusa | annullata
  note_admin          TEXT,
  created_at          TIMESTAMPTZ,
  chiusa_il           TIMESTAMPTZ
)
```

---

### Preventivo
Preventivo economico per un intervento.

```sql
preventivo (
  id                  UUID PRIMARY KEY,
  richiesta_id        UUID REFERENCES richiesta_intervento(id),
  impianto_id         UUID REFERENCES impianto(id),
  tenant_id           UUID REFERENCES tenant(id),
  emesso_da           UUID REFERENCES utente(id),
  importo_netto       NUMERIC(10,2),
  importo_iva         NUMERIC(10,2),
  importo_totale      NUMERIC(10,2),
  valuta              TEXT DEFAULT 'EUR',
  valido_fino         DATE,
  stato               TEXT DEFAULT 'inviato',  -- inviato | approvato | rifiutato | scaduto
  note                TEXT,
  documento_id        UUID REFERENCES documento(id),  -- PDF preventivo
  created_at          TIMESTAMPTZ,
  risposta_il         TIMESTAMPTZ,
  risposta_note       TEXT
)
```

---

### Link Accesso Firmato
Link temporaneo per enti di controllo (nessun account richiesto).

```sql
link_accesso_firmato (
  id                  UUID PRIMARY KEY,
  tenant_id           UUID REFERENCES tenant(id),
  impianto_ids        UUID[],  -- uno o più impianti accessibili
  creato_da           UUID REFERENCES utente(id),
  descrizione         TEXT,  -- es. "Verifica INAIL 2024 - Ascensore A"
  token_hash          TEXT NOT NULL UNIQUE,  -- HMAC-SHA256 del token
  scade_il            TIMESTAMPTZ NOT NULL,
  usato_il            TIMESTAMPTZ,
  revocato            BOOLEAN DEFAULT false,
  revocato_il         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ
)
```

---

### Audit Trail
Log immutabile di ogni azione significativa (append-only).

```sql
audit_log (
  id                  BIGSERIAL PRIMARY KEY,
  tenant_id           UUID,
  entita_tipo         TEXT,   -- impianto | documento | intervento | ecc.
  entita_id           UUID,
  azione              TEXT,   -- created | updated | deleted | viewed | downloaded
  attore_id           UUID,   -- utente o NULL (link firmato)
  attore_tipo         TEXT,   -- utente | link_firmato | sistema | api_key
  attore_label        TEXT,   -- nome/email per leggibilità
  ip_address          INET,
  user_agent          TEXT,
  payload_diff        JSONB,  -- before/after per update
  timestamp           TIMESTAMPTZ DEFAULT NOW()
)
-- Nessun UPDATE o DELETE su questa tabella
```

---

### Notifica
Notifiche generate dal sistema e inviate agli attori.

```sql
notifica (
  id                  UUID PRIMARY KEY,
  tenant_id           UUID REFERENCES tenant(id),
  destinatario_id     UUID REFERENCES utente(id),
  tipo_evento         TEXT NOT NULL,
                      -- scadenza_imminente | intervento_completato | preventivo_ricevuto
                      --   documento_caricato | richiesta_inviata | conformita_cambiata
  canale              TEXT,   -- email | sms | push | webhook
  stato               TEXT DEFAULT 'pending',  -- pending | inviata | fallita | letta
  titolo              TEXT,
  corpo               TEXT,
  riferimento_tipo    TEXT,   -- impianto | intervento | documento | ecc.
  riferimento_id      UUID,
  tentativo           INTEGER DEFAULT 1,
  inviata_il          TIMESTAMPTZ,
  letta_il            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ
)
```

---

## Indici chiave

```sql
-- Performance query frequenti
CREATE INDEX idx_impianto_tenant      ON impianto(tenant_id);
CREATE INDEX idx_impianto_edificio    ON impianto(edificio_id);
CREATE INDEX idx_impianto_qr          ON impianto(qr_code_uuid);
CREATE INDEX idx_scadenza_data        ON scadenza(data_scadenza) WHERE stato = 'aperta';
CREATE INDEX idx_intervento_stato     ON intervento(stato, tenant_id);
CREATE INDEX idx_documento_impianto   ON documento(impianto_id);
CREATE INDEX idx_audit_entita         ON audit_log(entita_tipo, entita_id);
CREATE INDEX idx_notifica_dest_stato  ON notifica(destinatario_id, stato);

-- Row Level Security
ALTER TABLE impianto ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento ENABLE ROW LEVEL SECURITY;
-- (policy per tenant_id su ogni tabella sensibile)
```

---

## Relazioni chiave — riepilogo

| Relazione | Cardinalità | Note |
|---|---|---|
| Tenant → Edificio | 1:N | Un'azienda gestisce N edifici |
| Edificio → Impianto | 1:N | Un edificio ha N impianti |
| Impianto → Fascicolo | 1:1 | Uno-a-uno |
| Impianto → Scadenza | 1:N | Più scadenze per impianto |
| Impianto → Intervento | 1:N | Storico interventi |
| Intervento → Documento | 1:N | Documenti allegati all'intervento |
| Impianto → Documento | 1:N | Documenti generici del fascicolo |
| Richiesta → Preventivo | 1:N | Più preventivi per richiesta |
| Preventivo → Documento | 1:1 | PDF del preventivo |
| Unità → Utente (condomino) | N:M | Tramite `unita_persona` |
