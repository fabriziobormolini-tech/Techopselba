import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { StatoConformita, Priorita, StatoIntervento, StatoRichiesta } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date))
}

export function conformitaLabel(stato: StatoConformita): string {
  const map: Record<StatoConformita, string> = {
    conforme: 'Conforme',
    in_scadenza: 'In scadenza',
    scaduto: 'Scaduto',
    non_valutabile: 'N/D',
  }
  return map[stato] ?? stato
}

export function conformitaColor(stato: StatoConformita): string {
  const map: Record<StatoConformita, string> = {
    conforme: 'bg-green-100 text-green-800 border-green-200',
    in_scadenza: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    scaduto: 'bg-red-100 text-red-800 border-red-200',
    non_valutabile: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return map[stato] ?? 'bg-gray-100 text-gray-600'
}

export function prioritaColor(p: Priorita): string {
  const map: Record<Priorita, string> = {
    bassa: 'bg-blue-100 text-blue-700',
    normale: 'bg-gray-100 text-gray-700',
    alta: 'bg-orange-100 text-orange-700',
    urgente: 'bg-red-100 text-red-700',
  }
  return map[p] ?? 'bg-gray-100 text-gray-700'
}

export function interventoStatoLabel(stato: StatoIntervento): string {
  const map: Record<StatoIntervento, string> = {
    pianificato: 'Pianificato',
    assegnato: 'Assegnato',
    in_corso: 'In corso',
    completato: 'Completato',
    annullato: 'Annullato',
  }
  return map[stato] ?? stato
}

export function richiestaStatoLabel(stato: StatoRichiesta): string {
  const map: Record<StatoRichiesta, string> = {
    aperta: 'Aperta',
    presa_in_carico: 'Presa in carico',
    in_lavorazione: 'In lavorazione',
    chiusa: 'Chiusa',
    annullata: 'Annullata',
  }
  return map[stato] ?? stato
}

export function tipoImpiantoLabel(tipo: string): string {
  const map: Record<string, string> = {
    ascensore: 'Ascensore',
    antincendio: 'Antincendio',
    caldaia: 'Caldaia',
    climatizzazione: 'Climatizzazione',
    idrico: 'Impianto idrico',
    elettrico: 'Impianto elettrico',
    altro: 'Altro',
  }
  return map[tipo] ?? tipo
}

export function giorniAScadenza(data: string): number {
  const oggi = new Date()
  const scadenza = new Date(data)
  return Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24))
}
