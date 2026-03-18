# Intervio

**Hub documentale per la manutenzione tecnica degli edifici.**

Intervio è lo strato di aggregazione che collega software esistenti (FSM, gestionali, certificatori) e li rende accessibili ai quattro attori del processo manutentivo: manutentore, amministratore, condomino, ente di controllo.

Il punto fisico di ancoraggio è un **QR code** stampato su etichetta resistente, applicato a ogni impianto. Scansionando il QR, ogni attore autorizzato accede alla propria vista senza installare app dedicate né creare account per ogni edificio.

> Intervio non compete con Mainsim, Domustudio, Certifico o i software degli enti verificatori. Li integra e ne aggrega l'output sul fascicolo digitale dell'impianto.

---

## Documentazione

| Documento | Descrizione |
|---|---|
| [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) | Architettura generale, componenti, pattern di integrazione |
| [DATA_MODEL.md](./DATA_MODEL.md) | Entità, relazioni, schema logico |
| [API_DESIGN.md](./API_DESIGN.md) | Endpoint REST, webhook, contratti di integrazione |

---

## Attori

| Attore | Ruolo |
|---|---|
| 🔧 Manutentore / Azienda | Gestisce clienti, impianti, interventi, documenti, DDT, fatturazione |
| 🏢 Amministratore | Dashboard multi-edificio, scadenze, approvazioni, gestione documenti |
| 👤 Condomino / Proprietario | Richieste intervento, tracking, documenti del proprio edificio |
| 🔍 Ente di controllo | Accesso in sola lettura al fascicolo impianto, stati di conformità |

---

## Quick Start (Development)

```bash
# Clone
git clone https://github.com/fabriziobormolini-tech/Techopselba.git
cd Techopselba

# Documentazione
# Tutti i file .md nella root descrivono architettura e design
```
