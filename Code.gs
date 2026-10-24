/**
 * ==============================================================================
 * GESTIÓN DE VENTAS Y CONTABILIDAD MULTI-ROL (ADMIN / VENDEDORES)
 * Google Apps Script Backend (Code.gs)
 * ==============================================================================
 */

// Nombres de Hojas
const SHEET_PRODUCTS = "Prodotti";
const SHEET_SELLERS = "Venditori";
const SHEET_SALES = "Vendite";
const SHEET_SETTLEMENTS = "SaldiMensili";
const SCRIPT_PROP_SPREADSHEET_ID = "APP_SPREADSHEET_ID";
const SCRIPT_PROP_ADMIN_PASSWORD = "ADMIN_PASSWORD";

// Contraseña inicial por defecto del Administrador
const DEFAULT_ADMIN_PASSWORD = "admin2026";

/**
 * Servicio Web App doGet
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Gestión de Ventas y Envíos')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Generador de contraseñas aleatorias seguras
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
 * Gestión de Contraseña de Administrador
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

function verifyAdminLogin(inputPassword) {
  const actualPass = getAdminPassword();
  if (inputPassword === actualPass) {
    return { success: true, message: "Acceso concedido como Administrador" };
  } else {
    return { success: false, error: "Contraseña de Administrador incorrecta" };
  }
}

/**
 * REQUISITO 6 Y 7: Login de Vendedor por Email y Contraseña (sin desplegable público)
 */
function verifySellerLogin(email, password) {
  try {
    const ss = getSpreadsheet();
    const sellers = getAllSellers(ss);
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPass = String(password || "").trim();

    const found = sellers.find(s => String(s.email).trim().toLowerCase() === cleanEmail);
    if (!found) {
      return { success: false, error: "No existe ningún vendedor registrado con ese correo electrónico." };
    }

    if (found.status === "Archivado") {
      return { success: false, error: "Esta cuenta de vendedor se encuentra archivada / inactiva. Contacta al Administrador." };
    }

    if (String(found.password).trim() !== cleanPass) {
      return { success: false, error: "Contraseña incorrecta para este vendedor." };
    }

    return {
      success: true,
      seller: {
        id: found.id,
        name: found.name,
        email: found.email,
        status: found.status
      }
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * Obtiene o inicializa la hoja de cálculo de backend
 */
function getSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty(SCRIPT_PROP_SPREADSHEET_ID);
  let ss = null;

  if (ssId) {
    try {
      ss = SpreadsheetApp.openById(ssId);
    } catch (err) {
      console.warn("Hoja de cálculo guardada no accesible: " + err.message);
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}
  }

  if (!ss) {
    ss = SpreadsheetApp.create("Gestión de Ventas - Base de Datos");
    props.setProperty(SCRIPT_PROP_SPREADSHEET_ID, ss.getId());
  }

  setupDatabaseSheets(ss);
  return ss;
}

/**
 * Configuración de columnas y estructura de hojas
 */
function setupDatabaseSheets(ss) {
  // 1. Hoja de Productos
  let prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!prodSheet) {
    prodSheet = ss.insertSheet(SHEET_PRODUCTS);
    prodSheet.appendRow([
      "ID", "Título", "Descripción", "FotoUrl", "PrecioCompra", 
      "PrecioMínimo", "PrecioMáximo", "AsignadoA", "FechaCreación", "Activo"
    ]);
    prodSheet.getRange("A1:J1").setFontWeight("bold").setBackground("#e9ecef");
  }

  // 2. Hoja de Vendedores (con Password y Estado)
  let sellersSheet = ss.getSheetByName(SHEET_SELLERS);
  if (!sellersSheet) {
    sellersSheet = ss.insertSheet(SHEET_SELLERS);
    sellersSheet.appendRow(["ID", "Nombre", "Email", "Teléfono", "FechaCreación", "Estado", "Password"]);
    sellersSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#e9ecef");
    sellersSheet.appendRow(["VEND-001", "Mario Rossi", "mario.rossi@ejemplo.com", "+34 600 123 456", new Date().toISOString(), "Activo", generateRandomPassword(8)]);
    sellersSheet.appendRow(["VEND-002", "Laura Gómez", "laura.gomez@ejemplo.com", "+34 600 654 321", new Date().toISOString(), "Activo", generateRandomPassword(8)]);
  }

  // 3. Hoja de Ventas (Con seguimiento de Envíos: EnvioEstado, FechaEnvio, TrackingEnvio, NotasEnvio)
  let salesSheet = ss.getSheetByName(SHEET_SALES);
  if (!salesSheet) {
    salesSheet = ss.insertSheet(SHEET_SALES);
    salesSheet.appendRow([
      "ID", "Fecha", "VendedorID", "VendedorNombre", "ProductoID", 
      "ProductoNombre", "PrecioVenta", "PrecioCompraAdmin", "GananciaVendedor", 
      "Estado", "Liquidado", "FechaLiquidación", "PeríodoLiquidado", "Notas", "Devuelta",
      "EnvioEstado", "FechaEnvio", "TrackingEnvio", "NotasEnvio"
    ]);
    salesSheet.getRange("A1:S1").setFontWeight("bold").setBackground("#e9ecef");
  }

  // 4. Hoja de Historial de Liquidaciones
  let settlementsSheet = ss.getSheetByName(SHEET_SETTLEMENTS);
  if (!settlementsSheet) {
    settlementsSheet = ss.insertSheet(SHEET_SETTLEMENTS);
    settlementsSheet.appendRow([
      "ID", "VendedorID", "VendedorNombre", "MesAño", "FechaLiquidación", 
      "TotalVentas", "TotalEntregadoAdmin", "TotalComisiones", "AjustesDevoluciones", 
      "ImporteNetoPagado", "Notas", "VentasIDs"
    ]);
    settlementsSheet.getRange("A1:L1").setFontWeight("bold").setBackground("#e9ecef");
  }
}

/**
 * Devuelve los datos iniciales
 */
function getInitialData(sellerId) {
  try {
    const ss = getSpreadsheet();
    getAdminPassword();

    const products = getAllProducts(ss);
    const sellers = getAllSellers(ss);
    const sales = getAllSales(ss, sellerId);
    const settlements = getAllSettlements(ss, sellerId);

    return {
      success: true,
      products: products,
      sellers: sellers,
      sales: sales,
      settlements: settlements,
      currentSellerId: sellerId || null
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// PRODUCTOS
// ==========================================

function getAllProducts(ss) {
  if (!ss) ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    list.push({
      id: String(row[0]),
      title: String(row[1] || ""),
      description: String(row[2] || ""),
      photoUrl: String(row[3] || ""),
      purchasePrice: Number(row[4] || 0),
      minPrice: Number(row[5] || 0),
      maxPrice: Number(row[6] || 0),
      assignedTo: String(row[7] || "TUTTI"),
      createdAt: row[8] ? new Date(row[8]).toISOString() : "",
      active: row[9] !== false && String(row[9]).toLowerCase() !== "false"
    });
  }
  return list;
}

function addProduct(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PRODUCTS);
    const id = "PROD-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const createdAt = new Date().toISOString();

    sheet.appendRow([
      id,
      data.title || "Nuevo Producto",
      data.description || "",
      data.photoUrl || "",
      Number(data.purchasePrice || 0),
      Number(data.minPrice || 0),
      Number(data.maxPrice || 0),
      data.assignedTo || "TUTTI",
      createdAt,
      true
    ]);

    return { success: true, id: id, message: "Producto enviado con éxito a los vendedores" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function deleteProduct(productId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PRODUCTS);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(productId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Producto eliminado" };
      }
    }
    return { success: false, error: "Producto no encontrado" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// VENDEDORES (CONTRASEÑA ALEATORIA, ESTADOS Y BORRADO)
// ==========================================

function getAllSellers(ss) {
  if (!ss) ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SELLERS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    
    let status = String(row[5] || "Activo");
    if (status === "true") status = "Activo";
    if (status === "false") status = "Archivado";

    list.push({
      id: String(row[0]),
      name: String(row[1] || ""),
      email: String(row[2] || ""),
      phone: String(row[3] || ""),
      createdAt: row[4] ? new Date(row[4]).toISOString() : "",
      status: status, // "Activo", "De Vacaciones", "De Baja", "Archivado"
      password: String(row[6] || "12345678"),
      active: status === "Activo"
    });
  }
  return list;
}

function addSeller(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const id = "VEND-" + Utilities.getUuid().substring(0, 6).toUpperCase();
    const createdAt = new Date().toISOString();
    // REQUISITO 7: Asignación de contraseña aleatoria
    const password = data.password || generateRandomPassword(8);

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
      message: "Vendedor registrado. Contraseña asignada: " + password 
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * REQUISITO 7: Cambiar contraseña de vendedor (random) por el Admin sin conocer la anterior
 */
function resetSellerPassword(sellerId, newPassword) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const rows = sheet.getDataRange().getValues();
    const finalPass = newPassword || generateRandomPassword(8);

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(sellerId)) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 7).setValue(finalPass);
        return { 
          success: true, 
          newPassword: finalPass, 
          message: "Nueva contraseña generada para " + rows[i][1] + ": " + finalPass 
        };
      }
    }
    return { success: false, error: "Vendedor no encontrado" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function updateSellerStatus(sellerId, newStatus) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(sellerId)) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 6).setValue(newStatus);
        return { success: true, message: "Estado de " + rows[i][1] + " actualizado a: " + newStatus };
      }
    }
    return { success: false, error: "Vendedor no encontrado" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function deleteSeller(sellerId) {
  try {
    const ss = getSpreadsheet();
    const sales = getAllSales(ss, sellerId);
    
    if (sales.length > 0) {
      updateSellerStatus(sellerId, "Archivado");
      return { 
        success: true, 
        archived: true,
        message: "El vendedor tiene ventas en su historial contable. Ha sido ARCHIVADO para preservar la contabilidad." 
      };
    }

    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(sellerId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Vendedor eliminado de la base de datos." };
      }
    }
    return { success: false, error: "Vendedor no encontrado" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// VENTAS Y ENVÍOS (REQUISITOS 1, 2, 4 Y 5)
// ==========================================

function getAllSales(ss, filterSellerId) {
  if (!ss) ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SALES);
  const data = sheet.getDataRange().getValues();
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
      id: String(row[0]),
      date: row[1] ? new Date(row[1]).toISOString() : "",
      sellerId: sellerId,
      sellerName: String(row[3] || ""),
      productId: String(row[4] || ""),
      productName: String(row[5] || ""),
      salePrice: Number(row[6] || 0),
      adminPurchasePrice: Number(row[7] || 0),
      sellerProfit: Number(row[8] || 0),
      status: String(row[9] || "Venta Confirmada"), // Todas las registradas son confirmadas
      settled: row[10] === true || String(row[10]).toLowerCase() === "true",
      settlementDate: row[11] ? new Date(row[11]).toISOString() : "",
      settlementPeriod: String(row[12] || ""),
      notes: String(row[13] || ""),
      returned: row[14] === true || String(row[14]).toLowerCase() === "true",
      // REQUISITO 1: Datos de Envío
      shippingStatus: String(row[15] || "Pendiente de Envío"), // "Pendiente de Envío" o "Enviada"
      shippingDate: row[16] ? new Date(row[16]).toISOString() : "",
      shippingTracking: String(row[17] || ""),
      shippingNotes: String(row[18] || "")
    });
  }
  return list;
}

/**
 * REQUISITO 2: Una venta registrada por el vendedor ya es confirmada de inmediato
 */
function recordSale(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const id = "VENTA-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();

    const salePrice = Number(data.salePrice || 0);
    const adminCost = Number(data.adminPurchasePrice || 0);
    const sellerProfit = Math.max(0, salePrice - adminCost);

    // Estado es siempre confirmado; estado de envío inicial es 'Pendiente de Envío'
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
      "Venta Confirmada", // Confirmada de inmediato
      false, // Liquidado
      "",    // Fecha liquidación
      "",    // Período
      data.notes || "",
      false, // Devuelta
      "Pendiente de Envío", // EnvioEstado
      "", // FechaEnvio
      "", // TrackingEnvio
      ""  // NotasEnvio
    ]);

    return { success: true, id: id, message: "¡Venta registrada y confirmada con éxito!" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * REQUISITO 1: Admin registra el envío del producto
 */
function registerSaleShipping(saleId, shippingData) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows = sheet.getDataRange().getValues();
    const nowIso = shippingData.date ? new Date(shippingData.date).toISOString() : new Date().toISOString();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 16).setValue("Enviada");
        sheet.getRange(rowIdx, 17).setValue(nowIso);
        sheet.getRange(rowIdx, 18).setValue(shippingData.tracking || "");
        sheet.getRange(rowIdx, 19).setValue(shippingData.notes || "");

        return { 
          success: true, 
          message: "Envío registrado con éxito para la venta " + saleId + ". El vendedor ya puede verlo en tiempo real." 
        };
      }
    }
    return { success: false, error: "Venta no encontrada" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * REQUISITO 4: Admin puede borrar cualquier venta (doble confirmación)
 */
function deleteSaleByAdmin(saleId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Venta " + saleId + " eliminada definitivamente por el Administrador." };
      }
    }
    return { success: false, error: "Venta no encontrada" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * REQUISITO 5: El vendedor puede cancelar/borrar una venta SOLO SI NO HA SIDO ENVIADA POR ADMIN
 */
function deleteSaleBySeller(saleId, sellerId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        const rowSellerId = String(rows[i][2]);
        if (rowSellerId !== String(sellerId)) {
          return { success: false, error: "No tienes permiso para eliminar esta venta." };
        }

        const shippingStatus = String(rows[i][15] || "Pendiente de Envío");
        if (shippingStatus === "Enviada") {
          return { 
            success: false, 
            error: "¡ACCESO DENEGADO! Esta venta ya ha sido ENVIADA por el Administrador y no puede ser eliminada. Solicite una devolución si el cliente rechaza el producto." 
          };
        }

        // Si no ha sido enviada, se elimina
        sheet.deleteRow(i + 1);
        return { success: true, message: "Venta " + saleId + " cancelada y eliminada correctamente antes del envío." };
      }
    }
    return { success: false, error: "Venta no encontrada" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * REQUISITO 3: Devolución de producto (conservando ajuste negativo si ya estaba liquidada)
 */
function processReturnSale(saleId, returnReason) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        const rowIdx = i + 1;
        const current = rows[i];
        
        const productName = String(current[5] || "Producto");
        const wasSettled = current[10] === true || String(current[10]).toLowerCase() === "true";
        const previouslyEarnedProfit = Number(current[8] || 0);

        let notePrefix = "[DEVOLUCIÓN DE PRODUCTO: " + productName + "]";
        if (returnReason) notePrefix += " Motivo: " + returnReason + ".";

        let explanatoryNote = "";
        if (wasSettled) {
          explanatoryNote = notePrefix + " ATENCIÓN: La venta ya estaba liquidada (Comisión ya percibida: €" + 
            previouslyEarnedProfit.toFixed(2) + "). Dicho importe constituye una deuda del vendedor con el administrador en el período siguiente como saldo negativo.";
        } else {
          explanatoryNote = notePrefix + " Venta anulada antes de la liquidación. Relación económica resuelta a cero.";
        }

        const existingNote = String(current[13] || "");
        const combinedNote = existingNote ? existingNote + "\n" + explanatoryNote : explanatoryNote;

        sheet.getRange(rowIdx, 10).setValue("Devuelta");
        sheet.getRange(rowIdx, 14).setValue(combinedNote);
        sheet.getRange(rowIdx, 15).setValue(true);

        return {
          success: true,
          wasSettled: wasSettled,
          profitToRecover: wasSettled ? previouslyEarnedProfit : 0,
          productName: productName,
          message: wasSettled 
            ? "Devolución procesada: la comisión de €" + previouslyEarnedProfit.toFixed(2) + " se adeudará al vendedor en el próximo período."
            : "Devolución completada: venta cancelada y saldo resuelto a cero con éxito."
        };
      }
    }
    return { success: false, error: "Venta no encontrada" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// CONTABILIDAD (DISTINGUE VENTAS ENVIADAS Y NO ENVIADAS)
// ==========================================

function getAllSettlements(ss, filterSellerId) {
  if (!ss) ss = getSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_SETTLEMENTS);
  const data = sheet.getDataRange().getValues();
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
      id: String(row[0]),
      sellerId: sellerId,
      sellerName: String(row[2] || ""),
      period: String(row[3] || ""),
      settlementDate: row[4] ? new Date(row[4]).toISOString() : "",
      totalSales: Number(row[5] || 0),
      totalOwedAdmin: Number(row[6] || 0),
      totalSellerCommission: Number(row[7] || 0),
      returnAdjustments: Number(row[8] || 0),
      netPaid: Number(row[9] || 0),
      notes: String(row[10] || ""),
      salesIds: String(row[11] || "")
    });
  }
  return list;
}

function calculateSellerAccounting(sellerId) {
  try {
    const ss = getSpreadsheet();
    const allSales = getAllSales(ss, sellerId);

    let shippedSales = [];
    let notShippedSales = [];
    let settledSales = [];
    
    let totalShippedSalesAmount = 0;
    let totalOwedAdminShipped = 0;
    let totalSellerCommissionShipped = 0;

    let totalNotShippedAmount = 0;
    let totalSellerCommissionNotShipped = 0;

    let totalNegativeAdjustments = 0;
    let adjustmentNotes = [];

    allSales.forEach(sale => {
      if (sale.status === "Devuelta" || sale.returned) {
        if (sale.settled) {
          totalNegativeAdjustments += sale.sellerProfit;
          adjustmentNotes.push({
            saleId: sale.id,
            productName: sale.productName,
            amount: -sale.sellerProfit,
            note: "Devolución de '" + sale.productName + "' (Venta " + sale.id + "): comisión ya liquidada de €" + 
                  sale.sellerProfit.toFixed(2) + " debida de vuelta por el vendedor al administrador."
          });
        }
      } else if (sale.status === "Venta Confirmada") {
        if (sale.settled) {
          settledSales.push(sale);
        } else {
          // REQUISITO 3: Distinción entre enviadas y no enviadas
          if (sale.shippingStatus === "Enviada") {
            shippedSales.push(sale);
            totalShippedSalesAmount += sale.salePrice;
            totalOwedAdminShipped += sale.adminPurchasePrice;
            totalSellerCommissionShipped += sale.sellerProfit;
          } else {
            notShippedSales.push(sale);
            totalNotShippedAmount += sale.salePrice;
            totalSellerCommissionNotShipped += sale.sellerProfit;
          }
        }
      }
    });

    const finalAmountOwedToAdmin = totalOwedAdminShipped + totalNegativeAdjustments;
    const netSellerCommissionShipped = totalSellerCommissionShipped - totalNegativeAdjustments;

    return {
      success: true,
      sellerId: sellerId,
      summary: {
        totalShippedSalesAmount: totalShippedSalesAmount,
        totalOwedAdminShipped: totalOwedAdminShipped,
        totalSellerCommissionShipped: totalSellerCommissionShipped,
        netSellerCommissionShipped: netSellerCommissionShipped,
        finalAmountOwedToAdmin: finalAmountOwedToAdmin,
        totalNotShippedAmount: totalNotShippedAmount,
        totalSellerCommissionNotShipped: totalSellerCommissionNotShipped,
        negativeAdjustmentsFromReturns: totalNegativeAdjustments
      },
      adjustmentNotes: adjustmentNotes,
      shippedSalesCount: shippedSales.length,
      notShippedSalesCount: notShippedSales.length,
      shippedSales: shippedSales,
      notShippedSales: notShippedSales,
      settledSalesCount: settledSales.length
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function closeAndSettlePeriod(sellerId, periodLabel, customNote) {
  try {
    const ss = getSpreadsheet();
    const accounting = calculateSellerAccounting(sellerId);
    if (!accounting.success) throw new Error(accounting.error);

    const pendingSales = accounting.shippedSales;
    if (pendingSales.length === 0 && accounting.summary.negativeAdjustmentsFromReturns === 0) {
      return { success: false, error: "No hay ventas enviadas o ajustes que liquidar para este vendedor." };
    }

    const salesSheet = ss.getSheetByName(SHEET_SALES);
    const salesRows = salesSheet.getDataRange().getValues();
    const nowIso = new Date().toISOString();
    const period = periodLabel || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");

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
    const settlementId = "SALDO-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    
    let sellerName = sellerId;
    const sellers = getAllSellers(ss);
    const foundSeller = sellers.find(s => s.id === sellerId);
    if (foundSeller) sellerName = foundSeller.name;

    let notesText = customNote || "Período liquidado con normalidad.";
    if (accounting.adjustmentNotes.length > 0) {
      notesText += " | Notas Ajustes Devoluciones: " + accounting.adjustmentNotes.map(n => n.note).join(" ; ");
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
      success: true,
      settlementId: settlementId,
      period: period,
      message: "¡Período " + period + " liquidado con éxito para " + sellerName + "!"
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
