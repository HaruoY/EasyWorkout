/**
 * Code.gs
 *
 * Entry point della Web App. Pattern "action-based": il frontend chiama sempre lo stesso
 * URL passando un parametro `action` (es. "login", "createPlan") più un payload JSON.
 * Questo sostituisce il routing REST di Express, che Apps Script non supporta nativamente.
 *
 * doGet  → usato per azioni di sola lettura (permette anche chiamate dirette da browser)
 * doPost → usato per azioni che scrivono dati (richiede corpo JSON)
 *
 * IMPORTANTE: eseguire setup() una sola volta dall'editor prima del primo utilizzo,
 * per creare i fogli con le intestazioni corrette.
 */

function setup() {
  initAllSheets_();
  Logger.log('Setup completato: fogli creati/verificati.');
}

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  var action = e.parameter.action;
  var body = {};
  if (e.postData && e.postData.contents) {
    try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  }

  try {
    var result = routeAction_(action, e, body);
    return jsonResponse_(result.status || 200, result.data);
  } catch (err) {
    return jsonResponse_(err.httpStatus || 500, { error: err.message || 'Errore interno.' });
  }
}

/** Crea una risposta JSON. Nota: Apps Script Web App non supporta header CORS custom
 *  su ContentService; per questo il frontend usa modalità "no-cors friendly" (vedi guida). */
function jsonResponse_(status, data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/** Lancia un errore con uno status HTTP associato, nello stile delle risposte Express. */
function apiError_(status, message) {
  var err = new Error(message);
  err.httpStatus = status;
  throw err;
}

/** Verifica il token e ritorna { userId, email }, oppure lancia 401. */
function requireAuth_(e, body) {
  var token = (body && body.token) || e.parameter.token;
  var auth = verifyToken_(token);
  if (!auth) apiError_(401, 'Token di autenticazione mancante, non valido o scaduto.');
  return auth;
}

function routeAction_(action, e, body) {
  switch (action) {
    // ---- AUTH ----
    case 'register': return { data: handleRegister_(body) };
    case 'login': return { data: handleLogin_(body) };

    // ---- PROFILE ----
    case 'getProfile': return { data: handleGetProfile_(requireAuth_(e, body)) };
    case 'updateProfile': return { data: handleUpdateProfile_(requireAuth_(e, body), body) };
    case 'getCalorieNeeds': return { data: handleGetCalorieNeeds_(requireAuth_(e, body)) };

    // ---- PLANS ----
    case 'listPlans': return { data: handleListPlans_(requireAuth_(e, body)) };
    case 'getPlan': return { data: handleGetPlan_(requireAuth_(e, body), body.planId || e.parameter.planId) };
    case 'createPlan': return { data: handleCreatePlan_(requireAuth_(e, body), body) };
    case 'updatePlan': return { data: handleUpdatePlan_(requireAuth_(e, body), body) };
    case 'deletePlan': return { data: handleDeletePlan_(requireAuth_(e, body), body.planId || e.parameter.planId) };

    // ---- SESSIONS ----
    case 'listSessions': return { data: handleListSessions_(requireAuth_(e, body)) };
    case 'createSession': return { data: handleCreateSession_(requireAuth_(e, body), body) };
    case 'deleteSession': return { data: handleDeleteSession_(requireAuth_(e, body), body.sessionId || e.parameter.sessionId) };
    case 'listExercises': return { data: handleListExercises_(requireAuth_(e, body)) };
    case 'exerciseProgress': return { data: handleExerciseProgress_(requireAuth_(e, body), body.exerciseName || e.parameter.exerciseName) };

    // ---- WEIGHT LOGS ----
    case 'listWeightLogs': return { data: handleListWeightLogs_(requireAuth_(e, body)) };
    case 'addWeightLog': return { data: handleAddWeightLog_(requireAuth_(e, body), body) };
    case 'deleteWeightLog': return { data: handleDeleteWeightLog_(requireAuth_(e, body), body.logId || e.parameter.logId) };

    case 'health': return { data: { status: 'ok', timestamp: new Date().toISOString() } };

    default: apiError_(404, "Azione non riconosciuta: '" + action + "'.");
  }
}
