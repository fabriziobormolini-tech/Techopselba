# 🚀 Pubblicare Wayrd online (guida senza codice)

Obiettivo: avere un **link** (es. `https://wayrd.vercel.app`) che apri dal
telefono o dal computer e l'app funziona. Tutto **gratis**. Tempo: ~15 minuti.

Ti servono solo 2 account gratuiti: **Neon** (il database) e **Vercel**
(che fa girare l'app). Useremo l'account GitHub che hai già.

---

## Passo 1 — Crea il database (Neon, gratis)

1. Vai su **https://neon.tech** e premi **Sign up** → accedi con **GitHub**.
2. Crea un nuovo progetto (lascia le impostazioni di default, regione Europa).
3. Appena creato, Neon ti mostra una **Connection string** che inizia con
   `postgresql://...`. **Copiala** e tienila da parte (ci serve al Passo 3).
   - Se vedi due opzioni, scegli quella **senza** la parola `-pooler`.

---

## Passo 2 — Crea il sito (Vercel, gratis)

1. Vai su **https://vercel.com** → **Sign up** → accedi con **GitHub**.
2. Premi **Add New… → Project**.
3. Nella lista dei repository scegli **`Techopselba`** e premi **Import**.
   - Se non lo vedi, clicca "Adjust GitHub App Permissions" e dai accesso al repo.
4. **Non premere ancora Deploy.** Prima apri la sezione
   **Environment Variables** (Passo 3).

---

## Passo 3 — Imposta le 3 variabili

Nella schermata di import, apri **Environment Variables** e aggiungi queste 3
voci (Name → Value):

| Name | Value |
|------|-------|
| `DATABASE_URL` | la connection string di Neon copiata al Passo 1 |
| `SESSION_SECRET` | una frase a caso lunga, es. `wayrd-2026-frase-segreta-x9k2` |
| `CRON_SECRET` | un'altra frase a caso, es. `cron-segreto-7h3m` |

> Le integrazioni (voli, WhatsApp, pagamenti) restano in modalità demo: non
> serve nient'altro per far funzionare tutto.

---

## Passo 4 — Pubblica

Premi **Deploy** e aspetta ~2 minuti. Alla fine vedrai "🎉 Congratulations" e
un link tipo `https://techopselba-xxxx.vercel.app`. **Questo è il tuo sito.**

---

## Passo 5 — Carica i dati demo (una volta sola)

Apri nel browser questo indirizzo, mettendo il **tuo** link e il valore di
`CRON_SECRET` che hai scelto:

```
https://IL-TUO-LINK.vercel.app/api/seed?secret=IL-TUO-CRON-SECRET
```

Se vedi `"ok": true`, è andato. Ora ci sono l'account admin, un hotel demo e
alcuni voli di prova.

---

## Passo 6 — Apri l'app e accedi 🎉

- **Home:** `https://IL-TUO-LINK.vercel.app`
- **Pagina ospite:** `…/h/demo-hotel/checkin`
- **Dashboard hotel:** `…/dashboard`
  → email `reception@demo-hotel.it` · password `wayrd1234`
- **Admin:** `…/admin`
  → email `admin@wayrd.app` · password `wayrd-admin`

Nella dashboard premi **"⟳ Aggiorna voli"** per far controllare i voli e vedere
gli aggiornamenti.

---

## Domande frequenti

**I messaggi WhatsApp arrivano davvero?**
Non ancora: l'app è in modalità demo e *simula* gli invii (li vedi nel log
messaggi della dashboard). Per inviarli davvero serve un account WhatsApp
Business — si attiva dopo, aggiungendo le chiavi (vedi `README.md`).

**Devo pagare qualcosa?**
No. Neon e Vercel hanno piani gratuiti più che sufficienti per provare.

**Posso cambiare nome/dominio?**
Sì, da Vercel → Settings → Domains puoi collegare un dominio tuo (es.
`app.wayrd.com`).

**Il controllo automatico dei voli ogni quanto avviene?**
Sul piano gratuito di Vercel il controllo automatico parte una volta al giorno;
in qualsiasi momento puoi premere "⟳ Aggiorna voli" nella dashboard per
forzarlo. Per controlli più frequenti serve il piano Pro di Vercel.

---

Se ti blocchi in un passaggio, dimmi a quale numero sei arrivato e ti aiuto.
