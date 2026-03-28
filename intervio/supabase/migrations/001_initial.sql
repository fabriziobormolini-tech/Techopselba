-- Intervio MVP - Schema iniziale
-- Eseguire su Supabase SQL Editor

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE ruolo_utente AS ENUM ('manutentore', 'amministratore', 'condomino', 'tecnico');
CREATE TYPE tipo_impianto AS ENUM ('ascensore', 'antincendio', 'caldaia', 'climatizzazione', 'idrico', 'elettrico', 'altro');
CREATE TYPE stato_conformita AS ENUM ('conforme', 'in_scadenza', 'scaduto', 'non_valutabile');
CREATE TYPE stato_intervento AS ENUM ('pianificato', 'assegnato', 'in_corso', 'completato', 'annullato');
CREATE TYPE stato_richiesta AS ENUM ('aperta', 'presa_in_carico', 'in_lavorazione', 'chiusa', 'annullata');
CREATE TYPE tipo_documento AS ENUM ('certificato', 'verbale', 'libretto', 'foto', 'dico', 'ddt', 'rapporto_verifica', 'preventivo', 'fattura', 'altro');
CREATE TYPE priorita_intervento AS ENUM ('bassa', 'normale', 'alta', 'urgente');
CREATE TYPE piano_servizio AS ENUM ('free', 'starter', 'professional', 'enterprise');

-- ============================================================
-- PROFILI UTENTE (estende auth.users di Supabase)
-- ============================================================
CREATE TABLE profili (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ruolo           ruolo_utente NOT NULL,
  nome            TEXT,
  cognome         TEXT,
  telefono        TEXT,
  azienda_nome    TEXT,          -- per manutentori
  partita_iva     TEXT,          -- per manutentori
  piano_servizio  piano_servizio DEFAULT 'free',
  attivo          BOOLEAN DEFAULT true,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger per creare profilo automaticamente al signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profili (id, ruolo, nome, cognome)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'ruolo')::ruolo_utente, 'condomino'),
    NEW.raw_user_meta_data->>'nome',
    NEW.raw_user_meta_data->>'cognome'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- EDIFICI
-- ============================================================
CREATE TABLE edifici (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                  TEXT NOT NULL,
  indirizzo_via         TEXT,
  indirizzo_civico      TEXT,
  indirizzo_cap         TEXT,
  indirizzo_comune      TEXT,
  indirizzo_provincia   TEXT,
  codice_fiscale_cond   TEXT,
  amministratore_id     UUID REFERENCES profili(id),
  manutentore_id        UUID REFERENCES profili(id),
  gestionale_esterno_id TEXT,
  gestionale_tipo       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UNITÀ IMMOBILIARI
-- ============================================================
CREATE TABLE unita_immobiliari (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edificio_id   UUID NOT NULL REFERENCES edifici(id) ON DELETE CASCADE,
  piano         TEXT,
  interno       TEXT,
  descrizione   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Relazione proprietario ↔ unità
CREATE TABLE unita_persone (
  unita_id        UUID REFERENCES unita_immobiliari(id) ON DELETE CASCADE,
  persona_id      UUID REFERENCES profili(id) ON DELETE CASCADE,
  tipo_relazione  TEXT DEFAULT 'proprietario',
  dal             DATE DEFAULT CURRENT_DATE,
  al              DATE,
  PRIMARY KEY (unita_id, persona_id)
);

-- ============================================================
-- IMPIANTI
-- ============================================================
CREATE TABLE impianti (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edificio_id         UUID NOT NULL REFERENCES edifici(id) ON DELETE CASCADE,
  qr_code_uuid        UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
  tipo                tipo_impianto NOT NULL,
  sottotipo           TEXT,
  marca               TEXT,
  modello             TEXT,
  matricola           TEXT,
  numero_serie        TEXT,
  anno_installazione  INTEGER,
  ubicazione          TEXT,
  note_tecniche       TEXT,
  attivo              BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FASCICOLO IMPIANTO (vista aggregata / cache)
-- ============================================================
CREATE TABLE fascicoli (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  impianto_id             UUID UNIQUE NOT NULL REFERENCES impianti(id) ON DELETE CASCADE,
  stato_conformita        stato_conformita DEFAULT 'non_valutabile',
  ultimo_intervento_at    TIMESTAMPTZ,
  prossima_scadenza_at    DATE,
  prossima_scadenza_tipo  TEXT,
  n_documenti             INTEGER DEFAULT 0,
  n_interventi            INTEGER DEFAULT 0,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger per creare fascicolo automaticamente
CREATE OR REPLACE FUNCTION crea_fascicolo()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO fascicoli (impianto_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_impianto_created
  AFTER INSERT ON impianti
  FOR EACH ROW EXECUTE FUNCTION crea_fascicolo();

-- ============================================================
-- SCADENZE
-- ============================================================
CREATE TABLE scadenze (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  impianto_id         UUID NOT NULL REFERENCES impianti(id) ON DELETE CASCADE,
  tipo                TEXT NOT NULL,
  normativa_rif       TEXT,
  ente_competente     TEXT,
  data_scadenza       DATE NOT NULL,
  data_completamento  DATE,
  stato               TEXT DEFAULT 'aperta',
  giorni_preavviso    INTEGER DEFAULT 30,
  note                TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID REFERENCES profili(id)
);

-- ============================================================
-- RICHIESTE INTERVENTO (da condomino)
-- ============================================================
CREATE TABLE richieste_intervento (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edificio_id     UUID NOT NULL REFERENCES edifici(id) ON DELETE CASCADE,
  impianto_id     UUID REFERENCES impianti(id),
  richiedente_id  UUID NOT NULL REFERENCES profili(id),
  titolo          TEXT NOT NULL,
  descrizione     TEXT,
  urgenza         priorita_intervento DEFAULT 'normale',
  stato           stato_richiesta DEFAULT 'aperta',
  note_admin      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  chiusa_il       TIMESTAMPTZ
);

-- ============================================================
-- INTERVENTI
-- ============================================================
CREATE TABLE interventi (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  impianto_id           UUID NOT NULL REFERENCES impianti(id) ON DELETE CASCADE,
  tipo                  TEXT NOT NULL DEFAULT 'ordinario',
  titolo                TEXT NOT NULL,
  descrizione           TEXT,
  stato                 stato_intervento DEFAULT 'pianificato',
  priorita              priorita_intervento DEFAULT 'normale',
  pianificato_il        TIMESTAMPTZ,
  iniziato_il           TIMESTAMPTZ,
  completato_il         TIMESTAMPTZ,
  tecnico_id            UUID REFERENCES profili(id),
  richiesta_id          UUID REFERENCES richieste_intervento(id),
  scadenza_id           UUID REFERENCES scadenze(id),
  fsm_esterno_id        TEXT,
  note_completamento    TEXT,
  firma_digitale_url    TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID REFERENCES profili(id)
);

-- ============================================================
-- DOCUMENTI
-- ============================================================
CREATE TABLE documenti (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  impianto_id           UUID NOT NULL REFERENCES impianti(id) ON DELETE CASCADE,
  intervento_id         UUID REFERENCES interventi(id),
  tipo                  tipo_documento NOT NULL,
  titolo                TEXT NOT NULL,
  descrizione           TEXT,
  file_path             TEXT NOT NULL,
  file_nome             TEXT,
  file_mime             TEXT,
  file_kb               INTEGER,
  hash_sha256           TEXT,
  caricato_da           UUID REFERENCES profili(id),
  caricato_il           TIMESTAMPTZ DEFAULT NOW(),
  visibile_condomino    BOOLEAN DEFAULT false,
  visibile_ente         BOOLEAN DEFAULT true
);

-- ============================================================
-- PREVENTIVI
-- ============================================================
CREATE TABLE preventivi (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  richiesta_id    UUID REFERENCES richieste_intervento(id),
  impianto_id     UUID REFERENCES impianti(id),
  emesso_da       UUID REFERENCES profili(id),
  importo_netto   NUMERIC(10,2),
  importo_iva     NUMERIC(10,2),
  importo_totale  NUMERIC(10,2),
  valuta          TEXT DEFAULT 'EUR',
  valido_fino     DATE,
  stato           TEXT DEFAULT 'inviato',
  note            TEXT,
  documento_id    UUID REFERENCES documenti(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  risposta_il     TIMESTAMPTZ,
  risposta_note   TEXT
);

-- ============================================================
-- LINK ACCESSO FIRMATO (enti di controllo)
-- ============================================================
CREATE TABLE link_accesso_firmati (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  impianto_ids    UUID[] NOT NULL,
  creato_da       UUID REFERENCES profili(id),
  descrizione     TEXT,
  token           TEXT UNIQUE NOT NULL,
  scade_il        TIMESTAMPTZ NOT NULL,
  revocato        BOOLEAN DEFAULT false,
  revocato_il     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AUDIT LOG (append-only)
-- ============================================================
CREATE TABLE audit_log (
  id              BIGSERIAL PRIMARY KEY,
  entita_tipo     TEXT,
  entita_id       UUID,
  azione          TEXT,
  attore_id       UUID,
  attore_tipo     TEXT DEFAULT 'utente',
  attore_label    TEXT,
  payload         JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDICI
-- ============================================================
CREATE INDEX idx_impianti_edificio ON impianti(edificio_id);
CREATE INDEX idx_impianti_qr ON impianti(qr_code_uuid);
CREATE INDEX idx_scadenze_data ON scadenze(data_scadenza) WHERE stato = 'aperta';
CREATE INDEX idx_interventi_impianto ON interventi(impianto_id);
CREATE INDEX idx_interventi_stato ON interventi(stato);
CREATE INDEX idx_documenti_impianto ON documenti(impianto_id);
CREATE INDEX idx_richieste_edificio ON richieste_intervento(edificio_id);
CREATE INDEX idx_edifici_admin ON edifici(amministratore_id);
CREATE INDEX idx_edifici_manut ON edifici(manutentore_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profili ENABLE ROW LEVEL SECURITY;
ALTER TABLE edifici ENABLE ROW LEVEL SECURITY;
ALTER TABLE impianti ENABLE ROW LEVEL SECURITY;
ALTER TABLE fascicoli ENABLE ROW LEVEL SECURITY;
ALTER TABLE scadenze ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventi ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE richieste_intervento ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivi ENABLE ROW LEVEL SECURITY;

-- Profili: ognuno vede il proprio
CREATE POLICY "profilo_self" ON profili FOR ALL USING (auth.uid() = id);

-- Edifici: admin vede i propri, manutentore vede i propri
CREATE POLICY "edifici_admin" ON edifici FOR ALL
  USING (amministratore_id = auth.uid() OR manutentore_id = auth.uid());

-- Impianti: visibili se si ha accesso all'edificio
CREATE POLICY "impianti_via_edificio" ON impianti FOR ALL
  USING (
    edificio_id IN (
      SELECT id FROM edifici
      WHERE amministratore_id = auth.uid() OR manutentore_id = auth.uid()
    )
  );

-- Condomini: vedono impianti del loro edificio
CREATE POLICY "impianti_condomino" ON impianti FOR SELECT
  USING (
    edificio_id IN (
      SELECT ui.edificio_id FROM unita_immobiliari ui
      JOIN unita_persone up ON up.unita_id = ui.id
      WHERE up.persona_id = auth.uid()
    )
  );

-- Documenti: follow impianto access
CREATE POLICY "documenti_access" ON documenti FOR ALL
  USING (
    impianto_id IN (
      SELECT id FROM impianti
    )
  );

-- Richieste: condomino vede le proprie, admin vede tutte del suo edificio
CREATE POLICY "richieste_richiedente" ON richieste_intervento FOR ALL
  USING (
    richiedente_id = auth.uid()
    OR edificio_id IN (SELECT id FROM edifici WHERE amministratore_id = auth.uid())
    OR edificio_id IN (SELECT id FROM edifici WHERE manutentore_id = auth.uid())
  );

-- Interventi: manutentore e admin
CREATE POLICY "interventi_access" ON interventi FOR ALL
  USING (
    tecnico_id = auth.uid()
    OR impianto_id IN (
      SELECT i.id FROM impianti i
      JOIN edifici e ON e.id = i.edificio_id
      WHERE e.amministratore_id = auth.uid() OR e.manutentore_id = auth.uid()
    )
  );
