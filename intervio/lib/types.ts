export type RuoloUtente = 'manutentore' | 'amministratore' | 'condomino' | 'tecnico'
export type TipoImpianto = 'ascensore' | 'antincendio' | 'caldaia' | 'climatizzazione' | 'idrico' | 'elettrico' | 'altro'
export type StatoConformita = 'conforme' | 'in_scadenza' | 'scaduto' | 'non_valutabile'
export type StatoIntervento = 'pianificato' | 'assegnato' | 'in_corso' | 'completato' | 'annullato'
export type StatoRichiesta = 'aperta' | 'presa_in_carico' | 'in_lavorazione' | 'chiusa' | 'annullata'
export type TipoDocumento = 'certificato' | 'verbale' | 'libretto' | 'foto' | 'dico' | 'ddt' | 'rapporto_verifica' | 'preventivo' | 'fattura' | 'altro'
export type Priorita = 'bassa' | 'normale' | 'alta' | 'urgente'
export type PianoServizio = 'free' | 'starter' | 'professional' | 'enterprise'

export interface Profilo {
  id: string
  ruolo: RuoloUtente
  nome: string | null
  cognome: string | null
  telefono: string | null
  azienda_nome: string | null
  partita_iva: string | null
  piano_servizio: PianoServizio
  attivo: boolean
  avatar_url: string | null
  created_at: string
}

export interface Edificio {
  id: string
  nome: string
  indirizzo_via: string | null
  indirizzo_civico: string | null
  indirizzo_cap: string | null
  indirizzo_comune: string | null
  indirizzo_provincia: string | null
  codice_fiscale_cond: string | null
  amministratore_id: string | null
  manutentore_id: string | null
  created_at: string
}

export interface Impianto {
  id: string
  edificio_id: string
  qr_code_uuid: string
  tipo: TipoImpianto
  sottotipo: string | null
  marca: string | null
  modello: string | null
  matricola: string | null
  numero_serie: string | null
  anno_installazione: number | null
  ubicazione: string | null
  note_tecniche: string | null
  attivo: boolean
  created_at: string
}

export interface Fascicolo {
  id: string
  impianto_id: string
  stato_conformita: StatoConformita
  ultimo_intervento_at: string | null
  prossima_scadenza_at: string | null
  prossima_scadenza_tipo: string | null
  n_documenti: number
  n_interventi: number
  updated_at: string
}

export interface Scadenza {
  id: string
  impianto_id: string
  tipo: string
  normativa_rif: string | null
  ente_competente: string | null
  data_scadenza: string
  data_completamento: string | null
  stato: string
  giorni_preavviso: number
  note: string | null
  created_at: string
  created_by: string | null
}

export interface Intervento {
  id: string
  impianto_id: string
  tipo: string
  titolo: string
  descrizione: string | null
  stato: StatoIntervento
  priorita: Priorita
  pianificato_il: string | null
  iniziato_il: string | null
  completato_il: string | null
  tecnico_id: string | null
  richiesta_id: string | null
  scadenza_id: string | null
  note_completamento: string | null
  firma_digitale_url: string | null
  created_at: string
  created_by: string | null
}

export interface Documento {
  id: string
  impianto_id: string
  intervento_id: string | null
  tipo: TipoDocumento
  titolo: string
  descrizione: string | null
  file_path: string
  file_nome: string | null
  file_mime: string | null
  file_kb: number | null
  caricato_da: string | null
  caricato_il: string
  visibile_condomino: boolean
  visibile_ente: boolean
}

export interface RichiestaIntervento {
  id: string
  edificio_id: string
  impianto_id: string | null
  richiedente_id: string
  titolo: string
  descrizione: string | null
  urgenza: Priorita
  stato: StatoRichiesta
  note_admin: string | null
  created_at: string
  updated_at: string
  chiusa_il: string | null
}

export interface Preventivo {
  id: string
  richiesta_id: string | null
  impianto_id: string | null
  emesso_da: string | null
  importo_netto: number | null
  importo_iva: number | null
  importo_totale: number | null
  valuta: string
  valido_fino: string | null
  stato: string
  note: string | null
  created_at: string
}

export interface LinkAccessoFirmato {
  id: string
  impianto_ids: string[]
  creato_da: string | null
  descrizione: string | null
  token: string
  scade_il: string
  revocato: boolean
  created_at: string
}

// Supabase Database type (semplificato per MVP)
export type Database = {
  public: {
    Tables: {
      profili: { Row: Profilo; Insert: Partial<Profilo>; Update: Partial<Profilo> }
      edifici: { Row: Edificio; Insert: Partial<Edificio>; Update: Partial<Edificio> }
      impianti: { Row: Impianto; Insert: Partial<Impianto>; Update: Partial<Impianto> }
      fascicoli: { Row: Fascicolo; Insert: Partial<Fascicolo>; Update: Partial<Fascicolo> }
      scadenze: { Row: Scadenza; Insert: Partial<Scadenza>; Update: Partial<Scadenza> }
      interventi: { Row: Intervento; Insert: Partial<Intervento>; Update: Partial<Intervento> }
      documenti: { Row: Documento; Insert: Partial<Documento>; Update: Partial<Documento> }
      richieste_intervento: { Row: RichiestaIntervento; Insert: Partial<RichiestaIntervento>; Update: Partial<RichiestaIntervento> }
      preventivi: { Row: Preventivo; Insert: Partial<Preventivo>; Update: Partial<Preventivo> }
      link_accesso_firmati: { Row: LinkAccessoFirmato; Insert: Partial<LinkAccessoFirmato>; Update: Partial<LinkAccessoFirmato> }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
