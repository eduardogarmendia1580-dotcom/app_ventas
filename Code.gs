/**
 * ==============================================================================
 * GESTIONE VENDITE E CONTABILITÀ MULTI-RUOLO (ADMIN / VENDITORI)
 * Google Apps Script Backend (Code.gs)
 * ==============================================================================
 */

// Nomi dei Fogli
const SHEET_PRODUCTS    = "Prodotti";
const SHEET_SELLERS     = "Venditori";
const SHEET_SALES       = "Vendite";
const SHEET_SETTLEMENTS = "SaldiMensili";

// Proprietà Script
// ID facoltativo del foglio Google Sheets (lasciare vuoto se lo script è già collegato al foglio)
const DEFAULT_SPREADSHEET_ID = "";

const SCRIPT_PROP_SPREADSHEET_ID = "APP_SPREADSHEET_ID";
const SCRIPT_PROP_ADMIN_PASSWORD = "ADMIN_PASSWORD";
const SCRIPT_PROP_ADMIN_EMAIL    = "ADMIN_EMAIL";

// Credenziali Admin predefinite
const DEFAULT_ADMIN_PASSWORD = "admin2026";
const DEFAULT_ADMIN_EMAIL    = "admin@gestione.com";

/**
 * Servizio Web App doGet
 */
/**
 * Servizio Web App doGet: serve la pagina HTML oppure gestisce richieste API REST
 */
function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter.action, e.parameter);
  }
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Gestione Vendite e Spedizioni')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/**
 * Servizio Web App doPost: riceve ed esegue chiamate API (per GitHub Pages o app mobile)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    const action = payload.action || (e && e.parameter ? e.parameter.action : '');
    return handleApiRequest(action, payload);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Gestore universale delle richieste API per la sincronizzazione esterna
 */
function handleApiRequest(action, data) {
  let result = { success: false, ok: false, error: 'Azione non riconosciuta: ' + action };
  try {
    switch (action) {
      case 'ping':
        result = { success: true, ok: true, message: 'Connessione a Google Apps Script riuscita!' };
        break;
      case 'verifyAdminLogin':
        result = verifyAdminLogin(data.email, data.password);
        break;
      case 'changeAdminPassword':
        result = changeAdminPassword(data.currentPassword, data.newPassword);
        break;
      case 'changeAdminEmail':
        result = changeAdminEmail(data.currentPassword, data.newEmail);
        break;
      case 'verifySellerLogin':
        result = verifySellerLogin(data.email, data.password);
        break;
      case 'getInitialData':
        result = getInitialData(data.sellerId || null);
        break;
      case 'addProduct':
        result = addProduct(data.product || data);
        break;
      case 'deleteProduct':
        result = deleteProduct(data.productId || data.id);
        break;
      case 'addSeller':
        result = addSeller(data.seller || data);
        break;
      case 'resetSellerPassword':
        result = resetSellerPassword(data.sellerId || data.id, data.newPassword || data.password);
        break;
      case 'updateSellerStatus':
        result = updateSellerStatus(data.sellerId || data.id, data.newStatus || data.status);
        break;
      case 'deleteSeller':
        result = deleteSeller(data.sellerId || data.id);
        break;
      case 'deleteSellerForce':
        result = deleteSellerForce(data.sellerId || data.id);
        break;
      case 'updateSaleAcceptance':
        result = updateSaleAcceptance(data.saleId, data.sellerId, data.status || data.acceptanceStatus);
        break;
      case 'recordSale':
        result = recordSale(data.sale || data);
        break;
      case 'registerSaleShipping':
        result = registerSaleShipping(data.saleId, data.shippingData || data);
        break;
      case 'deleteSaleByAdmin':
        result = deleteSaleByAdmin(data.saleId);
        break;
      case 'deleteSaleBySeller':
        result = deleteSaleBySeller(data.saleId, data.sellerId);
        break;
      case 'processReturnSale':
        result = processReturnSale(data.saleId, data.reason || data.returnReason);
        break;
      case 'closeAndSettlePeriod':
        result = closeAndSettlePeriod(data.sellerId, data.periodLabel, data.customNote);
        break;
    }
  } catch (err) {
    result = { success: false, ok: false, error: err.toString() };
  }

  if (result) {
    if (result.success !== undefined && result.ok === undefined) result.ok = result.success;
    if (result.ok !== undefined && result.success === undefined) result.success = result.ok;
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Generatore di password casuali sicure
 */
function generateRandomPassword(length) {
  const len = length || 8;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Gestione Password Amministratore
 */
function getAdminPassword() {
  const props = PropertiesService.getScriptProperties();
  let pass = props.getProperty(SCRIPT_PROP_ADMIN_PASSWORD);
  if (!pass) {
    pass = DEFAULT_ADMIN_PASSWORD;
    props.setProperty(SCRIPT_PROP_ADMIN_PASSWORD, pass);
  }
  return pass;
}

/**
 * Gestione Email Amministratore
 */
function getAdminEmail() {
  const props = PropertiesService.getScriptProperties();
  let email = props.getProperty(SCRIPT_PROP_ADMIN_EMAIL);
  if (!email) {
    email = DEFAULT_ADMIN_EMAIL;
    props.setProperty(SCRIPT_PROP_ADMIN_EMAIL, email);
  }
  return email;
}

/**
 * Verifica login Admin (email + password)
 */
function verifyAdminLogin(inputEmail, inputPassword) {
  const actualEmail = getAdminEmail();
  const actualPass  = getAdminPassword();

  const emailMatch = String(inputEmail  || "").trim().toLowerCase() === String(actualEmail).trim().toLowerCase();
  const passMatch  = String(inputPassword || "").trim() === String(actualPass).trim();

  if (emailMatch && passMatch) {
    return { success: true, adminEmail: actualEmail, message: "Accesso concesso come Amministratore" };
  } else if (!emailMatch) {
    return { success: false, error: "Email di Amministratore non riconosciuta." };
  } else {
    return { success: false, error: "Password di Amministratore errata." };
  }
}

/**
 * Cambio password Admin (verifica password attuale)
 */
function changeAdminPassword(currentPassword, newPassword) {
  try {
    const actualPass = getAdminPassword();
    if (String(currentPassword || "").trim() !== String(actualPass).trim()) {
      return { success: false, error: "La password attuale non è corretta." };
    }
    if (!newPassword || String(newPassword).trim().length < 6) {
      return { success: false, error: "La nuova password deve essere di almeno 6 caratteri." };
    }
    PropertiesService.getScriptProperties().setProperty(SCRIPT_PROP_ADMIN_PASSWORD, String(newPassword).trim());
    return { success: true, message: "Password di amministratore aggiornata con successo." };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Cambio email Admin (verifica password per conferma)
 */
function changeAdminEmail(currentPassword, newEmail) {
  try {
    const actualPass = getAdminPassword();
    if (String(currentPassword || "").trim() !== String(actualPass).trim()) {
      return { success: false, error: "La password non è corretta. Operazione non autorizzata." };
    }
    const cleanEmail = String(newEmail || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "Inserisci un indirizzo email valido." };
    }
    PropertiesService.getScriptProperties().setProperty(SCRIPT_PROP_ADMIN_EMAIL, cleanEmail);
    return { success: true, newEmail: cleanEmail, message: "Email di amministratore aggiornata con successo. Usa la nuova email al prossimo accesso." };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Login Venditore tramite Email e Password
 */
function verifySellerLogin(email, password) {
  try {
    const ss = getSpreadsheet();
    const sellers = getAllSellers(ss);
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPass  = String(password || "").trim();

    const found = sellers.find(s => String(s.email).trim().toLowerCase() === cleanEmail);
    if (!found) {
      return { success: false, error: "Nessun venditore registrato con questa email." };
    }

    if (found.status === "Archivado") {
      return { success: false, error: "Questo account venditore è archiviato / inattivo. Contatta l'Amministratore." };
    }

    if (String(found.password).trim() !== cleanPass) {
      return { success: false, error: "Password errata per questo venditore." };
    }

    return {
      success: true,
      seller: {
        id:     found.id,
        name:   found.name,
        email:  found.email,
        status: found.status
      }
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Ottiene o inizializza il foglio di calcolo backend
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = (typeof DEFAULT_SPREADSHEET_ID !== 'undefined' && DEFAULT_SPREADSHEET_ID.trim()) 
    ? DEFAULT_SPREADSHEET_ID.trim() 
    : props.getProperty(SCRIPT_PROP_SPREADSHEET_ID);
  let ss = null;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (err) {
      console.warn("Foglio di calcolo con ID non accessibile: " + err.message);
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}
  }

  if (!ss) {
    ss = SpreadsheetApp.create("Gestione Vendite - Database");
    props.setProperty(SCRIPT_PROP_SPREADSHEET_ID, ss.getId());
  }

  setupDatabaseSheets(ss);
  return ss;
}

/**
 * Configurazione colonne e struttura dei fogli
 */
function setupDatabaseSheets(ss) {
  // 1. Foglio Prodotti
  let prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!prodSheet) {
    prodSheet = ss.insertSheet(SHEET_PRODUCTS);
    prodSheet.appendRow([
      "ID", "Titolo", "Descrizione", "FotoUrl", "PrezzoAcquisto",
      "PrezzoMinimo", "PrezzoMassimo", "AssegnatoA", "DataCreazione", "Attivo"
    ]);
    prodSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#e9ecef");
  }

  // 2. Foglio Venditori (con Password e Stato)
  let sellersSheet = ss.getSheetByName(SHEET_SELLERS);
  if (!sellersSheet) {
    sellersSheet = ss.insertSheet(SHEET_SELLERS);
    sellersSheet.appendRow(["ID", "Nome", "Email", "Telefono", "DataCreazione", "Stato", "Password"]);
    sellersSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#e9ecef");
    sellersSheet.appendRow(["VEND-001", "Mario Rossi", "mario.rossi@esempio.com", "'+39 333 123 4567", new Date().toISOString(), "Activo", "Mario2026!"]);
    sellersSheet.appendRow(["VEND-002", "Laura Bianchi", "laura.bianchi@esempio.com", "'+39 333 765 4321", new Date().toISOString(), "Activo", "Laura2026!"]);
  }

  // 3. Foglio Vendite (con tracciamento Spedizioni)
  let salesSheet = ss.getSheetByName(SHEET_SALES);
  if (!salesSheet) {
    salesSheet = ss.insertSheet(SHEET_SALES);
    salesSheet.appendRow([
      "ID", "Data", "VenditoreID", "VenditoreNome", "ProdottoID",
      "ProdottoNome", "PrezzoVendita", "PrezzoAcquistoAdmin", "GuadagnoVenditore",
      "Stato", "Liquidato", "DataLiquidazione", "PeriodoLiquidato", "Note", "Restituito",
      "SpedizioneStato", "DataSpedizione", "TrackingSpedizione", "NoteSpedizione",
      "StatoAccettazione", "DataAccettazione"
    ]);
    salesSheet.getRange("A1:U1").setFontWeight("bold").setBackground("#e9ecef");
  }

  // 4. Foglio Storico Liquidazioni
  let settlementsSheet = ss.getSheetByName(SHEET_SETTLEMENTS);
  if (!settlementsSheet) {
    settlementsSheet = ss.insertSheet(SHEET_SETTLEMENTS);
    settlementsSheet.appendRow([
      "ID", "VenditoreID", "VenditoreNome", "MeseAnno", "DataLiquidazione",
      "TotaleVendite", "TotaleConsegnatoAdmin", "TotaleCommissioni", "AggiunsteResi",
      "ImportoNettoPagato", "Note", "VenditeIDs"
    ]);
    settlementsSheet.getRange("A1:L1").setFontWeight("bold").setBackground("#e9ecef");
  }
}

/**
 * Restituisce i dati iniziali dell'app
 */
function getInitialData(sellerId) {
  try {
    const ss = getSpreadsheet();
    getAdminPassword();
    getAdminEmail();

    const products    = getAllProducts(ss);
    const sellers     = getAllSellers(ss);
    const sales       = getAllSales(ss, sellerId);
    const settlements = getAllSettlements(ss, sellerId);

    return {
      success: true,
      products:        products,
      sellers:         sellers,
      sales:           sales,
      settlements:     settlements,
      currentSellerId: sellerId || null
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// PRODOTTI
// ==========================================

function getAllProducts(ss) {
  if (!ss) ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    const id = "PROD-001";
    const now = new Date().toISOString();
    try {
      sheet.appendRow([
        id,
        "Zapatillas Deportivas Runner Air",
        "Zapatillas de running ultraligeras y transpirables, tallas 40-45.",
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
        30.00,
        45.00,
        80.00,
        "TUTTI",
        now,
        true
      ]);
      return [{
        id:            id,
        title:         "Zapatillas Deportivas Runner Air",
        description:   "Zapatillas de running ultraligeras y transpirables, tallas 40-45.",
        photoUrl:      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500",
        purchasePrice: 30.00,
        minPrice:      45.00,
        maxPrice:      80.00,
        assignedTo:    "TUTTI",
        createdAt:     now,
        active:        true
      }];
    } catch(e) {
      return [];
    }
  }

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    list.push({
      id:            String(row[0]),
      title:         String(row[1] || ""),
      description:   String(row[2] || ""),
      photoUrl:      String(row[3] || ""),
      purchasePrice: Number(row[4] || 0),
      minPrice:      Number(row[5] || 0),
      maxPrice:      Number(row[6] || 0),
      assignedTo:    String(row[7] || "TUTTI"),
      createdAt:     row[8] ? new Date(row[8]).toISOString() : "",
      active:        row[9] !== false && String(row[9]).toLowerCase() !== "false"
    });
  }
  return list;
}

function addProduct(data) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PRODUCTS);
    const id    = "PROD-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const createdAt = new Date().toISOString();

    sheet.appendRow([
      id,
      data.title || "Nuovo Prodotto",
      data.description || "",
      data.photoUrl || "",
      Number(data.purchasePrice || 0),
      Number(data.minPrice || 0),
      Number(data.maxPrice || 0),
      data.assignedTo || "TUTTI",
      createdAt,
      true
    ]);

    return { success: true, id: id, message: "Prodotto inviato ai venditori con successo" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function deleteProduct(productId) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PRODUCTS);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(productId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Prodotto eliminato" };
      }
    }
    return { success: false, error: "Prodotto non trovato" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// VENDITORI (PASSWORD CASUALE, STATI E CANCELLAZIONE)
// ==========================================

function getAllSellers(ss) {
  if (!ss) ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SELLERS);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    let rawStatus = String(row[5] || "Activo").trim();
    let status = rawStatus;
    if (rawStatus === "true" || rawStatus.toLowerCase() === "attivo" || rawStatus.toLowerCase() === "activo" || rawStatus.toLowerCase() === "active" || !rawStatus) {
      status = "Activo";
      if (rawStatus !== "Activo") {
        try { sheet.getRange(i + 1, 6).setValue("Activo"); } catch(e){}
      }
    } else if (rawStatus === "false" || rawStatus.toLowerCase() === "archiviato" || rawStatus.toLowerCase() === "archivado") {
      status = "Archivado";
    }

    let phone = String(row[3] || "");
    if (phone === "#ERROR!") {
      phone = (i === 1) ? "+39 333 123 4567" : ((i === 2) ? "+39 333 765 4321" : "");
      try { sheet.getRange(i + 1, 4).setValue("'" + phone); } catch(e){}
    }

    list.push({
      id:        String(row[0]),
      name:      String(row[1] || ""),
      email:     String(row[2] || "").trim(),
      phone:     phone,
      createdAt: row[4] ? new Date(row[4]).toISOString() : "",
      status:    status,
      password:  String(row[6] || "12345678"),
      active:    status === "Activo"
    });
  }
  return list;
}

function addSeller(data) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const id    = "VEND-" + Utilities.getUuid().substring(0, 6).toUpperCase();
    const createdAt = new Date().toISOString();
    const password  = data.password || generateRandomPassword(8);

    sheet.appendRow([
      id,
      data.name,
      String(data.email || "").trim(),
      data.phone || "",
      createdAt,
      "Activo",
      password
    ]);

    return {
      success: true,
      id: id,
      generatedPassword: password,
      message: "Venditore registrato. Password assegnata: " + password
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Cambia la password di un venditore (solo Admin, senza conoscere la precedente)
 */
function resetSellerPassword(sellerId, newPassword) {
  try {
    const ss       = getSpreadsheet();
    const sheet    = ss.getSheetByName(SHEET_SELLERS);
    const rows     = sheet.getDataRange().getValues();
    const finalPass = newPassword || generateRandomPassword(8);

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(sellerId)) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 7).setValue(finalPass);
        return {
          success: true,
          newPassword: finalPass,
          message: "Nuova password generata per " + rows[i][1] + ": " + finalPass
        };
      }
    }
    return { success: false, error: "Venditore non trovato" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function updateSellerStatus(sellerId, newStatus) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(sellerId)) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 6).setValue(newStatus);
        return { success: true, message: "Stato di " + rows[i][1] + " aggiornato a: " + newStatus };
      }
    }
    return { success: false, error: "Venditore non trovato" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function deleteSeller(sellerId) {
  try {
    const ss    = getSpreadsheet();
    const sales = getAllSales(ss, sellerId);

    if (sales.length > 0) {
      updateSellerStatus(sellerId, "Archivado");
      return {
        success: true,
        archived: true,
        message: "Il venditore ha vendite nel suo storico contabile. È stato ARCHIVIATO per preservare la contabilità."
      };
    }

    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const rows  = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(sellerId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Venditore eliminato dal database." };
      }
    }
    return { success: false, error: "Venditore non trovato" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * ELIMINAZIONE FORZATA PER ADMIN (con doppia conferma già validata nel frontend)
 * Elimina fisicamente il venditore anche se ha vendite storiche.
 */
function deleteSellerForce(sellerId) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(sellerId)) {
        const sellerName = String(rows[i][1] || sellerId);
        sheet.deleteRow(i + 1);
        return {
          success: true,
          message: "Venditore \"" + sellerName + "\" eliminato permanentemente dall'Amministratore."
        };
      }
    }
    return { success: false, error: "Venditore non trovato" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Il venditore accetta o rifiuta una vendita proposta dall'Admin
 * acceptanceStatus: "ACEPTADA" | "RECHAZADA"
 */
function updateSaleAcceptance(saleId, sellerId, acceptanceStatus) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        const rowSellerId = String(rows[i][2] || "");
        if (rowSellerId !== String(sellerId)) {
          return { success: false, error: "Questa vendita non appartiene a questo venditore." };
        }
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 20).setValue(acceptanceStatus);
        sheet.getRange(rowIdx, 21).setValue(new Date().toISOString());
        if (acceptanceStatus === "ACEPTADA") {
          sheet.getRange(rowIdx, 10).setValue("Vendita Confermata");
        } else {
          sheet.getRange(rowIdx, 10).setValue("Rifiutata dal Venditore");
        }
        return {
          success: true,
          message: acceptanceStatus === "ACEPTADA"
            ? "Vendita accettata e confermata con successo."
            : "Vendita rifiutata. L'Amministratore potrà vederlo nel pannello."
        };
      }
    }
    return { success: false, error: "Vendita non trovata" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// VENDITE E SPEDIZIONI
// ==========================================

function getAllSales(ss, filterSellerId) {
  if (!ss) ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SALES);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const sellerId = String(row[2] || "");
    if (filterSellerId && sellerId !== String(filterSellerId)) {
      continue;
    }

    list.push({
      id:                String(row[0]),
      date:              row[1] ? new Date(row[1]).toISOString() : "",
      sellerId:          sellerId,
      sellerName:        String(row[3] || ""),
      productId:         String(row[4] || ""),
      productName:       String(row[5] || ""),
      salePrice:         Number(row[6] || 0),
      adminPurchasePrice:Number(row[7] || 0),
      sellerProfit:      Number(row[8] || 0),
      status:            String(row[9] || "Vendita Confermata"),
      settled:           row[10] === true || String(row[10]).toLowerCase() === "true",
      settlementDate:    row[11] ? new Date(row[11]).toISOString() : "",
      settlementPeriod:  String(row[12] || ""),
      notes:             String(row[13] || ""),
      returned:          row[14] === true || String(row[14]).toLowerCase() === "true",
      shippingStatus:    String(row[15] || "In Attesa di Spedizione"),
      shippingDate:      row[16] ? new Date(row[16]).toISOString() : "",
      shippingTracking:  String(row[17] || ""),
      shippingNotes:     String(row[18] || ""),
      acceptanceStatus:  String(row[19] || "ACEPTADA"),
      acceptedDate:      row[20] ? new Date(row[20]).toISOString() : ""
    });
  }
  return list;
}

/**
 * Registra una nuova vendita (confermata immediatamente)
 */
function recordSale(data) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const id    = "VENDITA-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const date  = data.date ? new Date(data.date).toISOString() : new Date().toISOString();

    const salePrice    = Number(data.salePrice || 0);
    const adminCost    = Number(data.adminPurchasePrice || 0);
    const sellerProfit = Math.max(0, salePrice - adminCost);

    sheet.appendRow([
      id,
      date,
      data.sellerId,
      data.sellerName,
      data.productId,
      data.productName,
      salePrice,
      adminCost,
      sellerProfit,
      data.proposedByAdmin ? "In Attesa di Accettazione" : "Vendita Confermata",
      false,
      "",
      "",
      data.notes || "",
      false,
      "In Attesa di Spedizione",
      "",
      "",
      "",
      data.proposedByAdmin ? "PENDIENTE" : "ACEPTADA",
      data.proposedByAdmin ? "" : new Date().toISOString()
    ]);

    return { success: true, id: id, message: "Vendita registrata e confermata con successo!" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Admin registra la spedizione del prodotto
 */
function registerSaleShipping(saleId, shippingData) {
  try {
    const ss     = getSpreadsheet();
    const sheet  = ss.getSheetByName(SHEET_SALES);
    const rows   = sheet.getDataRange().getValues();
    const nowIso = shippingData.date ? new Date(shippingData.date).toISOString() : new Date().toISOString();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 16).setValue("Spedita");
        sheet.getRange(rowIdx, 17).setValue(nowIso);
        sheet.getRange(rowIdx, 18).setValue(shippingData.tracking || "");
        sheet.getRange(rowIdx, 19).setValue(shippingData.notes || "");

        return {
          success: true,
          message: "Spedizione registrata con successo per la vendita " + saleId + ". Il venditore può vederla in tempo reale."
        };
      }
    }
    return { success: false, error: "Vendita non trovata" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Admin può eliminare qualsiasi vendita (doppia conferma)
 */
function deleteSaleByAdmin(saleId) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Vendita " + saleId + " eliminata definitivamente dall'Amministratore." };
      }
    }
    return { success: false, error: "Vendita non trovata" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Il venditore può cancellare una vendita SOLO SE NON È STATA SPEDITA DALL'ADMIN
 */
function deleteSaleBySeller(saleId, sellerId) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        const rowSellerId = String(rows[i][2]);
        if (rowSellerId !== String(sellerId)) {
          return { success: false, error: "Non hai il permesso di eliminare questa vendita." };
        }

        const shippingStatus = String(rows[i][15] || "In Attesa di Spedizione");
        if (shippingStatus === "Spedita") {
          return {
            success: false,
            error: "ACCESSO NEGATO! Questa vendita è già stata SPEDITA dall'Amministratore e non può essere eliminata. Richiedi un reso se il cliente rifiuta il prodotto."
          };
        }

        sheet.deleteRow(i + 1);
        return { success: true, message: "Vendita " + saleId + " annullata ed eliminata correttamente prima della spedizione." };
      }
    }
    return { success: false, error: "Vendita non trovata" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Reso del prodotto (conservando aggiustamento negativo se già liquidata)
 */
function processReturnSale(saleId, returnReason) {
  try {
    const ss    = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows  = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        const rowIdx  = i + 1;
        const current = rows[i];

        const productName           = String(current[5] || "Prodotto");
        const wasSettled            = current[10] === true || String(current[10]).toLowerCase() === "true";
        const previouslyEarnedProfit = Number(current[8] || 0);

        let notePrefix = "[RESO PRODOTTO: " + productName + "]";
        if (returnReason) notePrefix += " Motivo: " + returnReason + ".";

        let explanatoryNote = "";
        if (wasSettled) {
          explanatoryNote = notePrefix + " ATTENZIONE: La vendita era già liquidata (Commissione già percepita: €" +
            previouslyEarnedProfit.toFixed(2) + "). Tale importo costituisce un debito del venditore verso l'amministratore nel periodo successivo come saldo negativo.";
        } else {
          explanatoryNote = notePrefix + " Vendita annullata prima della liquidazione. Rapporto economico risolto a zero.";
        }

        const existingNote  = String(current[13] || "");
        const combinedNote  = existingNote ? existingNote + "\n" + explanatoryNote : explanatoryNote;

        sheet.getRange(rowIdx, 10).setValue("Restituita");
        sheet.getRange(rowIdx, 14).setValue(combinedNote);
        sheet.getRange(rowIdx, 15).setValue(true);

        return {
          success: true,
          wasSettled: wasSettled,
          profitToRecover: wasSettled ? previouslyEarnedProfit : 0,
          productName: productName,
          message: wasSettled
            ? "Reso elaborato: la commissione di €" + previouslyEarnedProfit.toFixed(2) + " sarà addebitata al venditore nel prossimo periodo."
            : "Reso completato: vendita annullata e saldo risolto a zero con successo."
        };
      }
    }
    return { success: false, error: "Vendita non trovata" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// CONTABILITÀ (DISTINGUE VENDITE SPEDITE E NON SPEDITE)
// ==========================================

function getAllSettlements(ss, filterSellerId) {
  if (!ss) ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SETTLEMENTS);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    const sellerId = String(row[1] || "");
    if (filterSellerId && sellerId !== String(filterSellerId)) {
      continue;
    }

    list.push({
      id:                    String(row[0]),
      sellerId:              sellerId,
      sellerName:            String(row[2] || ""),
      period:                String(row[3] || ""),
      settlementDate:        row[4] ? new Date(row[4]).toISOString() : "",
      totalSales:            Number(row[5] || 0),
      totalOwedAdmin:        Number(row[6] || 0),
      totalSellerCommission: Number(row[7] || 0),
      returnAdjustments:     Number(row[8] || 0),
      netPaid:               Number(row[9] || 0),
      notes:                 String(row[10] || ""),
      salesIds:              String(row[11] || "")
    });
  }
  return list;
}

function calculateSellerAccounting(sellerId) {
  try {
    const ss       = getSpreadsheet();
    const allSales = getAllSales(ss, sellerId);

    let shippedSales    = [];
    let notShippedSales = [];
    let settledSales    = [];

    let totalShippedSalesAmount           = 0;
    let totalOwedAdminShipped             = 0;
    let totalSellerCommissionShipped      = 0;
    let totalNotShippedAmount             = 0;
    let totalSellerCommissionNotShipped   = 0;
    let totalNegativeAdjustments          = 0;
    let adjustmentNotes                   = [];

    allSales.forEach(sale => {
      if (sale.status === "Restituita" || sale.returned) {
        if (sale.settled) {
          totalNegativeAdjustments += sale.sellerProfit;
          adjustmentNotes.push({
            saleId:      sale.id,
            productName: sale.productName,
            amount:      -sale.sellerProfit,
            note:        "Reso di '" + sale.productName + "' (Vendita " + sale.id + "): commissione già liquidata di €" +
                         sale.sellerProfit.toFixed(2) + " dovuta di ritorno dal venditore all'amministratore."
          });
        }
      } else if (sale.status === "Vendita Confermata") {
        if (sale.settled) {
          settledSales.push(sale);
        } else {
          if (sale.shippingStatus === "Spedita") {
            shippedSales.push(sale);
            totalShippedSalesAmount          += sale.salePrice;
            totalOwedAdminShipped            += sale.adminPurchasePrice;
            totalSellerCommissionShipped     += sale.sellerProfit;
          } else {
            notShippedSales.push(sale);
            totalNotShippedAmount            += sale.salePrice;
            totalSellerCommissionNotShipped  += sale.sellerProfit;
          }
        }
      }
    });

    const finalAmountOwedToAdmin     = totalOwedAdminShipped + totalNegativeAdjustments;
    const netSellerCommissionShipped = totalSellerCommissionShipped - totalNegativeAdjustments;

    return {
      success:  true,
      sellerId: sellerId,
      summary: {
        totalShippedSalesAmount:          totalShippedSalesAmount,
        totalOwedAdminShipped:            totalOwedAdminShipped,
        totalSellerCommissionShipped:     totalSellerCommissionShipped,
        netSellerCommissionShipped:       netSellerCommissionShipped,
        finalAmountOwedToAdmin:           finalAmountOwedToAdmin,
        totalNotShippedAmount:            totalNotShippedAmount,
        totalSellerCommissionNotShipped:  totalSellerCommissionNotShipped,
        negativeAdjustmentsFromReturns:   totalNegativeAdjustments
      },
      adjustmentNotes:    adjustmentNotes,
      shippedSalesCount:  shippedSales.length,
      notShippedSalesCount: notShippedSales.length,
      shippedSales:       shippedSales,
      notShippedSales:    notShippedSales,
      settledSalesCount:  settledSales.length
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function closeAndSettlePeriod(sellerId, periodLabel, customNote) {
  try {
    const ss         = getSpreadsheet();
    const accounting = calculateSellerAccounting(sellerId);
    if (!accounting.success) throw new Error(accounting.error);

    const pendingSales = accounting.shippedSales;
    if (pendingSales.length === 0 && accounting.summary.negativeAdjustmentsFromReturns === 0) {
      return { success: false, error: "Non ci sono vendite spedite o aggiustamenti da liquidare per questo venditore." };
    }

    const salesSheet = ss.getSheetByName(SHEET_SALES);
    const salesRows  = salesSheet.getDataRange().getValues();
    const nowIso     = new Date().toISOString();
    const period     = periodLabel || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");

    const settledIds = [];

    for (let i = 1; i < salesRows.length; i++) {
      const rowId = String(salesRows[i][0]);
      const isShippedForSeller = pendingSales.some(s => s.id === rowId);

      if (isShippedForSeller) {
        const rowIdx = i + 1;
        salesSheet.getRange(rowIdx, 11).setValue(true);
        salesSheet.getRange(rowIdx, 12).setValue(nowIso);
        salesSheet.getRange(rowIdx, 13).setValue(period);
        settledIds.push(rowId);
      }
    }

    const settlementsSheet = ss.getSheetByName(SHEET_SETTLEMENTS);
    const settlementId     = "SALDO-" + Utilities.getUuid().substring(0, 8).toUpperCase();

    let sellerName = sellerId;
    const sellers     = getAllSellers(ss);
    const foundSeller = sellers.find(s => s.id === sellerId);
    if (foundSeller) sellerName = foundSeller.name;

    let notesText = customNote || "Periodo liquidato regolarmente.";
    if (accounting.adjustmentNotes.length > 0) {
      notesText += " | Note Aggiustamenti Resi: " + accounting.adjustmentNotes.map(n => n.note).join(" ; ");
    }

    settlementsSheet.appendRow([
      settlementId,
      sellerId,
      sellerName,
      period,
      nowIso,
      accounting.summary.totalShippedSalesAmount,
      accounting.summary.finalAmountOwedToAdmin,
      accounting.summary.totalSellerCommissionShipped,
      accounting.summary.negativeAdjustmentsFromReturns,
      accounting.summary.netSellerCommissionShipped,
      notesText,
      settledIds.join(",")
    ]);

    return {
      success:      true,
      settlementId: settlementId,
      period:       period,
      message:      "Periodo " + period + " liquidato con successo per " + sellerName + "!"
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
