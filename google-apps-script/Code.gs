const SHEET_NAME = "Respuestas";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Body vacío." });
    }

    const payload = JSON.parse(e.postData.contents);
    const validationError = validatePayload(payload);
    if (validationError) {
      return jsonResponse({ success: false, error: validationError });
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      return jsonResponse({
        success: false,
        error:
          "No hay spreadsheet activo. Vincule este script desde la planilla o use SpreadsheetApp.openById(...).",
      });
    }

    const sheet =
      spreadsheet.getSheetByName(SHEET_NAME) ||
      spreadsheet.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "timestamp",
        "nombres",
        "apellido",
        "dni",
        "fechaNacimiento",
        "matricula",
        "expiracion",
        "control",
      ]);
    }

    sheet.appendRow([
      new Date(),
      payload.nombres,
      payload.apellido,
      payload.dni,
      payload.fechaNacimiento,
      payload.matricula,
      payload.expiracion,
      payload.control,
    ]);

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({
      success: false,
      error: error && error.message ? error.message : "Error inesperado.",
    });
  }
}

function validatePayload(payload) {
  if (!payload) return "Payload inválido.";
  if (!String(payload.nombres || "").trim()) return "nombres es obligatorio.";
  if (!String(payload.apellido || "").trim()) return "apellido es obligatorio.";
  if (!/^\d{7,8}$/.test(String(payload.dni || "").trim()))
    return "dni inválido.";
  if (!String(payload.fechaNacimiento || "").trim())
    return "fechaNacimiento es obligatorio.";
  if (!String(payload.matricula || "").trim()) return "matricula es obligatorio.";
  if (!String(payload.expiracion || "").trim()) return "expiracion es obligatorio.";
  if (!String(payload.control || "").trim()) return "control es obligatorio.";
  return null;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
