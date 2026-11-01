# 📊 Gestione Vendite, Spedizioni e Contabilità (PWA)

Applicazione Web Progressiva (**PWA**) installabile su dispositivi mobili (Android / iOS) e desktop, fruibile sia come Web App nativa di Google Apps Script sia come app statica ospitata su **GitHub Pages** con sincronizzazione in tempo reale con Google Sheets.

Permette di gestire il catalogo prodotti con prezzi all'ingrosso e margini consentiti, registrare vendite confermate in tempo reale, controllare la spedizione e il monitoraggio degli invii con numeri di tracking, liquidare le commissioni contabili per le vendite effettivamente spedite, e amministrare il team di venditori con massima privacy.

---

## 🔐 1. Accesso Utenti e Credenziali

Per motivi di privacy e sicurezza, la schermata di login richiede email e password manuali:

- **Amministratore**:
  - **Email predefinita**: `admin@gestione.com`
  - **Password predefinita**: `admin2026`
  - *Autonomia totale*: l'amministratore può modificare sia la propria **email** che la propria **password** direttamente dall'app in qualsiasi momento tramite il pulsante ⚙️ **Impostazioni**.

- **Venditori Demo (per test immediato)**:
  - **Venditore 1**: `mario.rossi@esempio.com` / Password: `Mario2026!`
  - **Venditore 2**: `laura.bianchi@esempio.com` / Password: `Laura2026!`

- **Nuovi Venditori**:
  - Creati dall'amministratore dalla scheda **"Gestione Venditori"**. Il sistema genera una password alfanumerica casuale sicura (es. `Xy#89qLk`), che l'amministratore può resettare in qualsiasi momento con un clic.

---

## ⚙️ 2. Cambio Email e Password dell'Amministratore

Dall'interno dell'applicazione:
1. Accedi come Amministratore.
2. Clicca sul pulsante **⚙️ Impostazioni** nella barra superiore in alto a destra.
3. Nel pannello modale che si apre puoi:
   - **Cambiare Password**: inserisci la password attuale, la nuova password desiderata e la conferma.
   - **Cambiare Email**: inserisci la password attuale (per autorizzare l'operazione) e il nuovo indirizzo email. L'aggiornamento ha effetto immediato sia nell'archivio locale che su Google Script Properties.

---

## 🌐 3. Sincronizzazione GitHub Pages con Google Apps Script

Se pubblichi l'applicazione su **GitHub Pages** (es. `https://eduardogarmendia1580-dotcom.github.io/app_ventas/`):

1. **Nel foglio Google Sheets**:
   - Vai su **Estensioni** > **Apps Script**.
   - Incolla il codice presente nel file `Code.gs`.
   - Clicca su **Distribuisci** > **Nuova distribuzione**.
   - Tipo: **Applicazione web**.
   - Esegui come: **Me stesso (il tuo account Google)**.
   - Chi può accedere: **Chiunque** (*Anyone*).
   - Copia l'**URL dell'applicazione web** generato (termina con `/exec`).

2. **Nell'app su GitHub Pages**:
   - Apri l'app nel browser.
   - Clicca su **⚙️ Configura URL Google Apps Script / Impostazioni** (visibile in basso nella schermata di login oppure nella barra superiore per l'Admin).
   - Incolla l'URL della tua Web App nel campo *"URL Web App Google Apps Script"*.
   - Clicca su **Salva e Testa Connessione**.
   - Da quel momento, l'app su GitHub Pages leggerà e salverà tutti i dati direttamente sul tuo Google Sheet!

---

## 🚚 4. Spedizioni e Monitoraggio Ordini

- **Vista Amministratore**: Elenca le vendite confermate. Permette di registrare data di invio, corriere (DHL, GLS, Poste, SEUR, ecc.) e codice di tracking.
- **Vista Venditore**: Il venditore visualizza in tempo reale lo stato delle sue vendite (*In Transito*, *Consegnato*), la data di partenza e il codice di tracciamento.

---

## 💰 5. Contabilità, Commissioni e Resi

- **Liquidazione basata su merce spedita**: Vengono liquidate solo le vendite effettivamente spedite.
- **Gestione Resi**: In caso di reso cliente per una vendita già liquidata in passato, il sistema calcola automaticamente la rettifica a compensazione trattenendola dal periodo contabile successivo.
- **Doppia conferma cancellazione**: L'amministratore dispone di doppia conferma modale per eliminare record contabili sensibili. I venditori possono cancellare le vendite solo finché non sono state spedite.

---

## 📁 File del Progetto

- `index.html`: Interfaccia grafica completa, reattiva e PWA.
- `Code.gs`: Backend Google Apps Script con API REST per GitHub Pages.
- `manifest.json`: Configurazione Progressive Web App (PWA).
- `sw.js`: Service worker per caching e offline.
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon.png`: Asset grafici e icone.
