# 📊 Gestione Vendite, Spedizioni e Contabilità (PWA)

Applicazione Web Progressiva (**PWA**) completamente in **italiano**, installabile su dispositivi mobili (Android / iOS) e ottimizzata sia per Google Apps Script che per la pubblicazione diretta su GitHub Pages.

Permette di gestire il catalogo prodotti con prezzi all'ingrosso e margini consentiti, registrare vendite confermate in tempo reale, controllare la spedizione e il monitoraggio degli invii con numeri di tracking, liquidare le commissioni contabili per le vendite effettivamente spedite, e amministrare il team di venditori con massima privacy e password casuali sicure.

---

## 🔐 1. Accesso e Privacy nel Login (Senza Elenchi Pubblici)

Per motivi di stretta privacy e sicurezza, **la schermata di accesso non mostra elenchi a discesa con i nomi dei venditori**. Ogni utente accede in modo privato:

- **Ruolo Amministratore**:
  - **Email**: L'admin inserisce la propria email (default: `admin@gestione.com`)
  - **Password** di default: `admin2026`
  - L'admin può cambiare sia la sua email che la sua password direttamente dall'app tramite il pannello **Impostazioni**.

- **Ruolo Venditore**:
  - **Email**: Inserita manualmente dal venditore (es. `mario.rossi@esempio.com`)
  - **Password assegnata**: Password sicura di 8 caratteri generata casualmente dall'Amministratore alla registrazione.
  - Opzione *"Ricorda sessione su questo dispositivo"* per accesso immediato nelle visite successive.

---

## 🔑 2. Generazione e Cambio Password Venditori

L'Amministratore ha il controllo totale delle chiavi di accesso del suo team dalla scheda **"Gestione Venditori"**:
- **Generazione casuale automatica**: Alla creazione di un nuovo venditore, il sistema genera automaticamente una password alfanumerica sicura (es. `Vnt#9k2P`).
- **Cambio o reset in qualsiasi momento**: L'Amministratore può rigenerare o modificare la password di qualsiasi venditore con un clic, **senza necessità di conoscere la password precedente**.
- **Pulsante copia rapida**: Permette di copiare la nuova password negli appunti per inviarla immediatamente al venditore via WhatsApp o email.

---

## 🚚 3. Spedizioni Prodotti e Tracciamento in Tempo Reale

Per riflettere l'operatività reale di spedizione fisica della merce:
- **Scheda "Spedizioni" dedicata**:
  - **Vista Amministratore**: Elenca tutte le vendite confermate in attesa di spedizione o già spedite. Permette di premere "Registra Spedizione", selezionare data, agenzia di corriere (Correos, SEUR, MRW, DHL, ecc.), inserire il codice di tracciamento e note di consegna.
  - **Vista Venditore (Tempo Reale)**: Il venditore vede immediatamente lo stato dei suoi ordini (*In Transito* vs *In Attesa Admin*), la data di partenza e il codice di tracciamento per informare i propri clienti.

---

## ✅ 4. Vendite Confermate Dirette (Senza Suddivisione Pendenti)

- Ogni vendita registrata nel sistema da un venditore o dall'Amministratore è considerata **Vendita Confermata** dal primo istante.
- Non esiste uno stato ambiguo di "vendita in attesa di conferma": il venditore inserisce l'ordine con il cliente finale e l'ordine passa direttamente alla coda di spedizione.

---

## 💰 5. Contabilità e Liquidazione per Vendite Spedite

Per garantire che non vengano liquidate commissioni per prodotti non ancora partiti dal magazzino:
- **Separazione contabile rigorosa**:
  - Le vendite confermate in **"Attesa di Spedizione"** sono contabilizzate come volume in attesa, ma **non sono incluse nel saldo liquidabile**.
  - Solo le vendite **"Spedite"** generano diritto al pagamento della commissione e debito a favore dell'Amministratore (prezzo base di costo).
- **Gestione dei Resi (`Reso`)**:
  - Se un cliente restituisce un prodotto di una vendita già liquidata in un periodo precedente, il sistema genera automaticamente un **saldo negativo (rettifica di compensazione)** che viene detratto nella liquidazione del periodo successivo.

---

## 🗑️ 6. Politiche di Cancellazione e Sicurezza dei Registri

- **Amministratore**: Può eliminare qualsiasi vendita dal sistema, ma per evitare perdite accidentali di dati contabili, il sistema richiede **doppia conferma rigorosa**.
- **Venditore**: Può cancellare o eliminare una vendita **SOLO SE l'Amministratore non l'ha ancora contrassegnata come "Spedita"**. Una volta che l'Amministratore registra la spedizione con il suo numero di tracking, l'opzione di cancellazione rimane **bloccata** per il venditore.

---

## 👥 7. Stati e Ciclo di Vita dei Venditori

Dalla scheda di amministrazione è possibile definire la situazione di ogni venditore:
- 🟢 **Attivo**: Venditore attivo con accesso alla registrazione delle vendite.
- 🏖️ **In Ferie**: In pausa transitoria.
- 🏥 **In Malattia**: Congedo medico o permesso temporaneo.
- 📦 **Archiviato**: Inattivo o ex-collaboratore.
- **Eliminazione / Protezione dello Storico**:
  - Se il venditore è nuovo e non ha vendite registrate, viene eliminato fisicamente dal database.
  - Se il venditore ha già vendite o liquidazioni nello storico, il sistema **lo Archivia automaticamente**, bloccando l'accesso ma mantenendo intatti tutti i saldi e i libri contabili storici.

---

## 📂 Dove Caricare Ogni File: Guida Passo a Passo

### Opzione A: Google Apps Script (Backend con Google Sheets)
Accedi a [script.google.com](https://script.google.com/) nel tuo progetto collegato al foglio di calcolo:
1. **`Code.gs`**: Incolla il codice del file `Code.gs`. Contiene tutte le funzioni di verifica delle credenziali, gestione spedizioni, doppia conferma e contabilità.
2. **`index.html`**: Crea un file HTML e incolla il codice di `index.html`.
3. **Pubblica** come Web App: Esegui > Distribuisci > Nuova distribuzione > Web App > "Chiunque" per l'accesso.
4. Nella prima esecuzione, l'app creerà automaticamente il foglio di calcolo con tutte le schede necessarie.

### Opzione B: GitHub Pages (App Mobile Web PWA Installabile)
Carica tutti i file di questa cartella nel tuo repository:
- `index.html`: Applicazione completa e reattiva.
- `manifest.json`: Manifesto di installazione PWA con icone e schermata di avvio.
- `sw.js`: Service Worker per funzionamento offline e cache ultra-veloce.
- `icon-192.png` e `icon-512.png`: Icone vettoriali ad alta risoluzione.
- `apple-touch-icon.png` e `favicon.png`: Icone per iPhone/iPad e schede browser.
- `Code.gs`: Codice sorgente di riferimento per la sincronizzazione con Sheets.
- `README.md` e `.gitignore`.

Per attivare GitHub Pages:
1. Vai su **Settings** > **Pages** nel tuo repository.
2. In **Source** seleziona **Deploy from a branch**.
3. Seleziona il ramo **`main`** e la cartella **`/(root)`** e premi **Save**.
4. In 1 minuto avrai il tuo URL pronto da condividere con i tuoi venditori.

---

## ⚙️ Configurazione Iniziale Admin

Le credenziali predefinite dell'amministratore sono:
- **Email**: `admin@gestione.com`
- **Password**: `admin2026`

> **IMPORTANTE**: Cambia la password di default al primo accesso tramite il pulsante ⚙️ **Impostazioni** nella barra superiore.

