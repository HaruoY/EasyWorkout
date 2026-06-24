# Diario Allenamento — Guida al deploy (Google Apps Script + GitHub Pages, costo zero)

Questa versione usa:
- **Backend**: Google Apps Script (Web App) + Google Sheets come database
- **Frontend**: React, pubblicato su GitHub Pages
- **Costo**: zero. Nessuna carta di credito richiesta in nessuno dei due servizi.

Leggi prima `README_COMPROMESSI.md` (sotto, in fondo a questo file) per capire i limiti rispetto a una versione Node/SQLite.

---

## PARTE 1 — Creare il backend su Google Apps Script

### 1.1 Crea il Google Sheet

1. Vai su [sheets.google.com](https://sheets.google.com) → **Foglio vuoto**
2. Rinominalo come preferisci (es. "Diario Allenamento — Database")
3. Lascia il foglio vuoto: i fogli/tabelle li crea lo script automaticamente al primo avvio

### 1.2 Apri l'editor Apps Script collegato al foglio

1. Nel Google Sheet, menu **Estensioni → Apps Script**
2. Si apre l'editor Apps Script, già collegato a questo foglio specifico (importante: ogni utente deve creare il proprio foglio + script, non condividere lo stesso script tra persone diverse a meno di volerlo davvero)

### 1.3 Carica i file del backend

Nell'editor Apps Script:

1. Elimina il contenuto del file `Code.gs` di default (è vuoto, va sovrascritto)
2. Per ciascuno dei file nella cartella `apps-script/` del progetto scaricato, crea un nuovo file nell'editor (icona **+** vicino a "File") con **lo stesso nome** (senza l'estensione `.gs`, Apps Script la aggiunge da solo), poi copia-incolla il contenuto:

   - `Code.gs`
   - `SheetDB.gs`
   - `Auth.gs`
   - `CalorieCalculator.gs`
   - `Handlers_Auth.gs`
   - `Handlers_Profile.gs`
   - `Handlers_Plans.gs`
   - `Handlers_Sessions.gs`
   - `Handlers_WeightLogs.gs`

   Risultato finale: 9 file `.gs` nell'editor, ciascuno con il contenuto del file omonimo che hai scaricato.

### 1.4 Esegui il setup iniziale

1. In alto nell'editor, dal menu a tendina delle funzioni, seleziona **setup**
2. Premi il pulsante **▶ Esegui**
3. La prima volta Google chiede l'autorizzazione: **Rivedi autorizzazioni** → scegli il tuo account → potrebbe apparire un avviso "App non verificata" → click su **Avanzate** → **Vai su [nome progetto] (non sicuro)** → **Consenti**

   > Questo avviso è normale: appare per qualsiasi script Apps Script personale non pubblicato sul Marketplace. Stai autorizzando uno script che hai scritto/copiato tu stesso ad accedere al tuo Google Sheet.

4. Controlla il Google Sheet: devono essere apparsi 6 nuovi fogli (`users`, `workout_plans`, `plan_exercises`, `workout_sessions`, `session_entries`, `body_weight_logs`), ciascuno con le intestazioni in riga 1

### 1.5 Pubblica come Web App

1. In alto a destra nell'editor, click **Esegui il deployment → Nuovo deployment**
2. Click sull'icona a forma di ingranaggio vicino a "Seleziona tipo" → **App web**
3. Configura così:
   - **Descrizione**: "Diario Allenamento API" (libero)
   - **Esegui come**: *Io (tuo account)*
   - **Chi ha accesso**: ***Chiunque*** ← fondamentale, altrimenti il frontend non può chiamare l'API
4. Click **Esegui il deployment**
5. Autorizza di nuovo se richiesto
6. Copia l'**URL dell'app web** che appare — è del tipo:
   ```
   https://script.google.com/macros/s/AKfycb......................./exec
   ```
   **Questo URL ti serve nella Parte 2.** Conservalo.

### 1.6 Verifica che il backend risponda

Apri in una nuova scheda del browser:
```
TUO_URL_COPIATO?action=health
```
Deve apparire qualcosa come:
```json
{"status":"ok","timestamp":"2026-06-24T..."}
```
Se vedi questo, il backend funziona. Se vedi un errore HTML di Google, ricontrolla che "Chi ha accesso" sia impostato su *Chiunque*.

---

## PARTE 2 — Pubblicare il frontend su GitHub Pages

### 2.1 Crea il repository su GitHub

1. Vai su [github.com/new](https://github.com/new)
2. Nome repository: es. `workout-tracker` (lo username.github.io/workout-tracker sarà l'URL finale)
3. Visibilità: **Public** (richiesto per GitHub Pages gratuito su account personali)
4. Click **Create repository**

### 2.2 Carica il progetto

Più semplice senza terminale:
1. Nella pagina del repo appena creato, click **uploading an existing file**
2. Apri la cartella scaricata `workout-tracker-gas/` sul tuo computer e **trascina tutto il contenuto** (non la cartella stessa, il contenuto: `frontend/`, `.github/`, `.gitignore`) nella zona di upload
3. Scorri in basso, click **Commit changes**

> Se preferisci usare Git da riga di comando in futuro va bene comunque, ma per questa prima volta l'upload da browser è sufficiente.

### 2.3 Imposta la variabile con l'URL del backend

1. Nel repository → **Settings** (tab in alto) → menu laterale **Secrets and variables → Actions**
2. Tab **Variables** → **New repository variable**
3. **Name**: `VITE_GAS_URL`
4. **Value**: l'URL copiato al punto 1.5 (quello che finisce in `/exec`)
5. **Add variable**

### 2.4 Abilita GitHub Pages con GitHub Actions

1. Sempre in **Settings** → menu laterale **Pages**
2. Sotto "Build and deployment" → **Source**: seleziona **GitHub Actions** (non "Deploy from a branch")

### 2.5 Avvia il primo deploy

Il workflow si attiva automaticamente al push, ma essendo il primo caricamento potrebbe non essere partito:
1. Tab **Actions** in alto nel repository
2. Se vedi un workflow "Deploy frontend to GitHub Pages" in coda o già eseguito, aspetta che finisca (icona verde ✓)
3. Se non è partito nulla, click sul workflow nella lista a sinistra → **Run workflow** → **Run workflow**

Il build richiede 1-2 minuti.

### 2.6 Apri l'app

Quando il workflow è verde, vai su **Settings → Pages**: in alto trovi il link pubblico, del tipo:
```
https://TUO-USERNAME.github.io/workout-tracker/
```

Apri quel link: l'app è live.

---

## Aggiornamenti futuri

Ogni volta che vuoi modificare il **frontend**: carichi i file aggiornati nel repository GitHub (drag&drop come al punto 2.2, sovrascrivendo) → il workflow si ri-attiva da solo → nuova versione online in 1-2 minuti.

Per modificare il **backend**: incolli il codice aggiornato nei file `.gs` corrispondenti nell'editor Apps Script → **Esegui il deployment → Gestisci deployment** → icona matita sul deployment esistente → **Nuova versione** → **Esegui il deployment**. Usare "Nuova versione" (non creare un deployment completamente nuovo) mantiene lo stesso URL, così il frontend continua a funzionare senza modifiche.

---

## Backup dei dati

I tuoi dati vivono nel Google Sheet creato al punto 1.1. È un file Google Drive normale: si vede, si esporta (**File → Scarica → Excel/CSV**), si versiona con la cronologia delle revisioni di Google Sheets (**File → Cronologia versioni**). Nessuna azione richiesta, ma se vuoi un backup extra periodico, fai semplicemente una copia del foglio (**File → Crea una copia**).

---

# README_COMPROMESSI.md — Limiti di questa architettura

Rispetto alla versione Node + Express + SQLite:

| Aspetto | Effetto pratico |
|---|---|
| **Niente bcrypt** | Le password sono hashate con SHA-256 + salt invece di bcrypt. Più debole (nessun cost factor), accettabile per uso personale/familiare, non per dati regolamentati. |
| **Niente transazioni SQL** | Scritture concorrenti molto rapide sullo stesso dato (raro con pochi utenti) potrebbero in teoria sovrapporsi. Mitigato con `LockService` sulle operazioni critiche (registrazione, creazione sessioni/schede). |
| **Niente JOIN/indici SQL** | Le query scansionano le righe linearmente. Con poche centinaia/migliaia di sessioni registrate non si nota; con decine di migliaia diventa lento. |
| **Token non firmati (no JWT reale)** | Il token è una stringa casuale opaca salvata in `PropertiesService`, non un JWT crittograficamente firmato. Funzionalmente equivalente per questo uso (verificabile solo dal server, scade dopo 7 giorni), ma meno standard. |
| **Limiti di quota Apps Script** | 6 minuti max per esecuzione, 20.000 chiamate/giorno sul piano gratuito. Irrilevante per uso personale, da considerare solo se l'app diventa pubblica con molti utenti. |
| **Cold start assente, ma latenza Sheets** | Apps Script non ha "sleep" come Render free, ma ogni chiamata legge/scrive su Google Sheets via API interna, quindi le risposte sono qualche centinaio di ms più lente di un database reale. |

Per un diario di allenamento personale o familiare con poche persone, nessuno di questi limiti è bloccante.
