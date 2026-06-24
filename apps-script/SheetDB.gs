/**
 * SheetDB.gs
 *
 * Strato di accesso ai dati: tratta ogni foglio dello Spreadsheet come una tabella.
 * Riga 1 = intestazioni (nomi colonna). Ogni riga successiva = un record.
 *
 * Convenzioni:
 * - Ogni tabella ha una colonna "id" (numero intero incrementale, univoco nel foglio).
 * - I valori booleani/numerici vengono preservati nel tipo originale quando possibile.
 * - Le funzioni non sono transazionali: con pochi utenti concorrenti il rischio di
 *   sovrapposizione in scrittura è basso, ma esiste. Vedi LockService in Code.gs per le
 *   operazioni più sensibili (creazione utente, inserimento sessione).
 */

var SHEET_NAMES = {
  USERS: 'users',
  WORKOUT_PLANS: 'workout_plans',
  PLAN_EXERCISES: 'plan_exercises',
  WORKOUT_SESSIONS: 'workout_sessions',
  SESSION_ENTRIES: 'session_entries',
  BODY_WEIGHT_LOGS: 'body_weight_logs',
};

var SHEET_SCHEMAS = {
  users: ['id', 'email', 'password_hash', 'password_salt', 'name', 'sex', 'birth_date', 'height_cm', 'weight_kg', 'activity_level', 'goal', 'formula', 'created_at'],
  workout_plans: ['id', 'user_id', 'name', 'description', 'day_of_week', 'created_at'],
  plan_exercises: ['id', 'plan_id', 'exercise_name', 'target_sets', 'target_reps', 'notes', 'position'],
  workout_sessions: ['id', 'user_id', 'plan_id', 'plan_name', 'session_date', 'notes', 'created_at'],
  session_entries: ['id', 'session_id', 'exercise_name', 'set_number', 'reps', 'weight_kg', 'rpe'],
  body_weight_logs: ['id', 'user_id', 'log_date', 'weight_kg'],
};

/** Ottiene (creando se assente) il foglio con le intestazioni corrette. */
function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(SHEET_SCHEMAS[name]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** Inizializza tutti i fogli richiesti dallo schema (idempotente). Chiamata da setup(). */
function initAllSheets_() {
  Object.keys(SHEET_SCHEMAS).forEach(function (name) {
    getSheet_(name);
  });
  // Rimuove il foglio di default "Foglio1"/"Sheet1" se vuoto e non più necessario
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ['Foglio1', 'Sheet1'].forEach(function (defaultName) {
    var s = ss.getSheetByName(defaultName);
    if (s && s.getDataRange().getNumRows() <= 1 && s.getDataRange().getNumColumns() <= 1) {
      try { ss.deleteSheet(s); } catch (e) {}
    }
  });
}

/** Legge tutte le righe di un foglio come array di oggetti {colonna: valore}. */
function readTable_(name) {
  var sheet = getSheet_(name);
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (row.every(function (cell) { return cell === ''; })) continue; // riga vuota
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    rows.push(obj);
  }
  return rows;
}

/** Restituisce il prossimo id incrementale disponibile per una tabella. */
function nextId_(name) {
  var rows = readTable_(name);
  if (rows.length === 0) return 1;
  var maxId = rows.reduce(function (max, r) { return Math.max(max, Number(r.id) || 0); }, 0);
  return maxId + 1;
}

/** Inserisce un nuovo record (oggetto) in coda al foglio, rispettando l'ordine delle colonne. */
function insertRow_(name, record) {
  var sheet = getSheet_(name);
  var headers = SHEET_SCHEMAS[name];
  var row = headers.map(function (h) {
    return record.hasOwnProperty(h) ? record[h] : '';
  });
  sheet.appendRow(row);
  return record;
}

/** Trova l'indice di riga (1-based, includendo l'header) di un record per id. Ritorna -1 se non trovato. */
function findRowIndexById_(sheet, headers, id) {
  var idColIndex = headers.indexOf('id');
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (Number(values[i][idColIndex]) === Number(id)) return i + 1; // +1 perché getRange è 1-based
  }
  return -1;
}

/** Aggiorna un record esistente individuato per id, applicando solo i campi presenti in `patch`. */
function updateRowById_(name, id, patch) {
  var sheet = getSheet_(name);
  var headers = SHEET_SCHEMAS[name];
  var rowIndex = findRowIndexById_(sheet, headers, id);
  if (rowIndex === -1) return null;

  var currentValues = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  var current = {};
  headers.forEach(function (h, i) { current[h] = currentValues[i]; });

  Object.keys(patch).forEach(function (key) {
    if (headers.indexOf(key) !== -1) current[key] = patch[key];
  });

  var newRow = headers.map(function (h) { return current[h]; });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([newRow]);
  return current;
}

/** Elimina un record per id. Ritorna true se eliminato, false se non trovato. */
function deleteRowById_(name, id) {
  var sheet = getSheet_(name);
  var headers = SHEET_SCHEMAS[name];
  var rowIndex = findRowIndexById_(sheet, headers, id);
  if (rowIndex === -1) return false;
  sheet.deleteRow(rowIndex);
  return true;
}

/** Elimina tutte le righe che soddisfano il predicato (usato per cascade delete). */
function deleteRowsWhere_(name, predicate) {
  var sheet = getSheet_(name);
  var headers = SHEET_SCHEMAS[name];
  var values = sheet.getDataRange().getValues();
  // Itera dal fondo per evitare problemi di shift degli indici durante la cancellazione
  var deletedCount = 0;
  for (var i = values.length - 1; i >= 1; i--) {
    var row = values[i];
    var obj = {};
    headers.forEach(function (h, j) { obj[h] = row[j]; });
    if (predicate(obj)) {
      sheet.deleteRow(i + 1);
      deletedCount++;
    }
  }
  return deletedCount;
}

/** Trova un singolo record per id. */
function findById_(name, id) {
  var rows = readTable_(name);
  for (var i = 0; i < rows.length; i++) {
    if (Number(rows[i].id) === Number(id)) return rows[i];
  }
  return null;
}
