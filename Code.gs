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
    .setTitle('Gestión de Ventas y Contabilidad')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
}

/**
 * Inclusión de archivos parciales
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Obtiene o inicializa la contraseña de administrador
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
 * Verifica la contraseña de Administrador
 */
function verifyAdminLogin(inputPassword) {
  const actualPass = getAdminPassword();
  if (inputPassword === actualPass) {
    return { success: true, message: "Acceso concedido como Administrador" };
  } else {
    return { success: false, error: "Contraseña de Administrador incorrecta" };
  }
}

/**
 * Permite cambiar la contraseña de Administrador
 */
function updateAdminPassword(oldPassword, newPassword) {
  const actualPass = getAdminPassword();
  if (oldPassword !== actualPass) {
    return { success: false, error: "La contraseña actual no es correcta." };
  }
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: "La nueva contraseña debe tener al menos 4 caracteres." };
  }
  PropertiesService.getScriptProperties().setProperty(SCRIPT_PROP_ADMIN_PASSWORD, newPassword);
  return { success: true, message: "Contraseña de Administrador actualizada correctamente." };
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
 * Configura las columnas y estructura de las hojas
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

  // 2. Hoja de Vendedores (Con soporte para Estado: Activo, Vacaciones, Baja, Archivado)
  let sellersSheet = ss.getSheetByName(SHEET_SELLERS);
  if (!sellersSheet) {
    sellersSheet = ss.insertSheet(SHEET_SELLERS);
    sellersSheet.appendRow(["ID", "Nombre", "Email", "Teléfono", "FechaCreación", "Estado", "PIN"]);
    sellersSheet.getRange("A1:G1").setFontWeight("bold").setBackground("#e9ecef");
    sellersSheet.appendRow(["VEND-001", "Mario Rossi", "mario.rossi@ejemplo.com", "+34 600 123 456", new Date().toISOString(), "Activo", "1234"]);
    sellersSheet.appendRow(["VEND-002", "Laura Gómez", "laura.gomez@ejemplo.com", "+34 600 654 321", new Date().toISOString(), "Activo", "1234"]);
  }

  // 3. Hoja de Ventas
  let salesSheet = ss.getSheetByName(SHEET_SALES);
  if (!salesSheet) {
    salesSheet = ss.insertSheet(SHEET_SALES);
    salesSheet.appendRow([
      "ID", "Fecha", "VendedorID", "VendedorNombre", "ProductoID", 
      "ProductoNombre", "PrecioVenta", "PrecioCompraAdmin", "GananciaVendedor", 
      "Estado", "Liquidado", "FechaLiquidación", "PeríodoLiquidado", "Notas", "Devuelta"
    ]);
    salesSheet.getRange("A1:O1").setFontWeight("bold").setBackground("#e9ecef");
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
    getAdminPassword(); // Asegura inicialización

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
// VENDEDORES (CON ARCHIVADO, BAJA, VACACIONES Y BORRADO)
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
    
    // Si la columna 5 es booleana vieja, normalizar a texto
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
      pin: String(row[6] || "1234"),
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
    const pin = data.pin || "1234";

    sheet.appendRow([
      id,
      data.name,
      data.email || "",
      data.phone || "",
      createdAt,
      "Activo",
      pin
    ]);

    return { success: true, id: id, message: "Vendedor registrado con éxito" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * REQUISITO 3: Cambiar estado del vendedor (Activo, De Vacaciones, De Baja, Archivado)
 */
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

/**
 * REQUISITO 3: Eliminar vendedor (comprobando si tiene ventas históricas)
 */
function deleteSeller(sellerId) {
  try {
    const ss = getSpreadsheet();
    const sales = getAllSales(ss, sellerId);
    
    // Si tiene ventas registradas, se archiva por seguridad contable
    if (sales.length > 0) {
      updateSellerStatus(sellerId, "Archivado");
      return { 
        success: true, 
        archived: true,
        message: "El vendedor tiene ventas en su historial contable. Para no perder los registros contables, ha sido ARCHIVADO en lugar de eliminado definitivamente." 
      };
    }

    // Si no tiene ventas, se puede eliminar la fila del registro
    const sheet = ss.getSheetByName(SHEET_SELLERS);
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(sellerId)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Vendedor eliminado correctamente de la base de datos." };
      }
    }
    return { success: false, error: "Vendedor no encontrado" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

// ==========================================
// VENTAS Y ESTADOS
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
      status: String(row[9] || "Ventas Pendientes"),
      settled: row[10] === true || String(row[10]).toLowerCase() === "true",
      settlementDate: row[11] ? new Date(row[11]).toISOString() : "",
      settlementPeriod: String(row[12] || ""),
      notes: String(row[13] || ""),
      returned: row[14] === true || String(row[14]).toLowerCase() === "true"
    });
  }
  return list;
}

function recordSale(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const id = "VENTA-" + Utilities.getUuid().substring(0, 8).toUpperCase();
    const date = data.date ? new Date(data.date).toISOString() : new Date().toISOString();

    const salePrice = Number(data.salePrice || 0);
    const adminCost = Number(data.adminPurchasePrice || 0);
    const sellerProfit = Math.max(0, salePrice - adminCost);
    const status = data.status || "Ventas Pendientes";

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
      status,
      false,
      "",
      "",
      data.notes || "",
      false
    ]);

    return { success: true, id: id, message: "¡Venta registrada con éxito!" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function updateSaleStatus(saleId, newStatus, optionalNote) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(saleId)) {
        const rowIdx = i + 1;
        sheet.getRange(rowIdx, 10).setValue(newStatus);
        if (optionalNote) {
          const currentNote = String(rows[i][13] || "");
          const updatedNote = currentNote ? currentNote + " | " + optionalNote : optionalNote;
          sheet.getRange(rowIdx, 14).setValue(updatedNote);
        }
        return { success: true, message: "Estado de venta actualizado a " + newStatus };
      }
    }
    return { success: false, error: "Venta no encontrada" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function updateSaleDetails(data) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_SALES);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        const rowIdx = i + 1;
        const salePrice = Number(data.salePrice);
        const adminCost = Number(data.adminPurchasePrice);
        const sellerProfit = Math.max(0, salePrice - adminCost);

        sheet.getRange(rowIdx, 7).setValue(salePrice);
        sheet.getRange(rowIdx, 8).setValue(adminCost);
        sheet.getRange(rowIdx, 9).setValue(sellerProfit);
        if (data.status) sheet.getRange(rowIdx, 10).setValue(data.status);
        if (data.notes !== undefined) sheet.getRange(rowIdx, 14).setValue(data.notes);

        return { success: true, message: "Detalles de venta guardados con éxito" };
      }
    }
    return { success: false, error: "Venta no encontrada" };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

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
        if (returnReason) {
          notePrefix += " Motivo: " + returnReason + ".";
        }

        let explanatoryNote = "";
        if (wasSettled) {
          explanatoryNote = notePrefix + " ATENCIÓN: La venta ya estaba liquidada (Comisión ya percibida: €" + 
            previouslyEarnedProfit.toFixed(2) + "). Dicho importe constituye una deuda del vendedor con el administrador en el período siguiente como saldo negativo.";
        } else {
          explanatoryNote = notePrefix + " Venta anulada antes de la liquidación. Relación económica resuelta a cero.";
        }

        const existingNote = String(current[13] || "");
        const combinedNote = existingNote ? existingNote + "\n" + explanatoryNote : explanatoryNote;

        sheet.getRange(rowIdx, 10).setValue("Restituita");
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
// CONTABILIDAD Y HISTORIAL DE SALDOS
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

    let pendingSettlementSales = [];
    let settledSales = [];
    let totalConfirmedSalesAmount = 0;
    let totalOwedAdminCurrent = 0;
    let totalSellerCommissionCurrent = 0;
    let totalNegativeAdjustments = 0;
    let adjustmentNotes = [];

    allSales.forEach(sale => {
      if (sale.status === "Restituita") {
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
      } else if (sale.status === "Ventas Confirmadas") {
        if (sale.settled) {
          settledSales.push(sale);
        } else {
          pendingSettlementSales.push(sale);
          totalConfirmedSalesAmount += sale.salePrice;
          totalOwedAdminCurrent += sale.adminPurchasePrice;
          totalSellerCommissionCurrent += sale.sellerProfit;
        }
      }
    });

    const finalAmountOwedToAdmin = totalOwedAdminCurrent + totalNegativeAdjustments;
    const netSellerCommission = totalSellerCommissionCurrent - totalNegativeAdjustments;

    return {
      success: true,
      sellerId: sellerId,
      summary: {
        totalConfirmedSalesAmount: totalConfirmedSalesAmount,
        totalOwedAdminBase: totalOwedAdminCurrent,
        negativeAdjustmentsFromReturns: totalNegativeAdjustments,
        finalAmountOwedToAdmin: finalAmountOwedToAdmin,
        grossSellerCommission: totalSellerCommissionCurrent,
        netSellerCommission: netSellerCommission
      },
      adjustmentNotes: adjustmentNotes,
      pendingSalesCount: pendingSettlementSales.length,
      pendingSales: pendingSettlementSales,
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

    const pendingSales = accounting.pendingSales;
    if (pendingSales.length === 0 && accounting.summary.negativeAdjustmentsFromReturns === 0) {
      return { success: false, error: "No hay ventas o ajustes que liquidar para este vendedor." };
    }

    const salesSheet = ss.getSheetByName(SHEET_SALES);
    const salesRows = salesSheet.getDataRange().getValues();
    const nowIso = new Date().toISOString();
    const period = periodLabel || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/yyyy");

    const settledIds = [];

    for (let i = 1; i < salesRows.length; i++) {
      const rowId = String(salesRows[i][0]);
      const isPendingForSeller = pendingSales.some(s => s.id === rowId);

      if (isPendingForSeller) {
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
      accounting.summary.totalConfirmedSalesAmount,
      accounting.summary.finalAmountOwedToAdmin,
      accounting.summary.grossSellerCommission,
      accounting.summary.negativeAdjustmentsFromReturns,
      accounting.summary.netSellerCommission,
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
