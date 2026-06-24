/**
 * Handlers_WeightLogs.gs
 */

function handleListWeightLogs_(auth) {
  var logs = readTable_(SHEET_NAMES.BODY_WEIGHT_LOGS)
    .filter(function (l) { return Number(l.user_id) === Number(auth.userId); })
    .sort(function (a, b) { return a.log_date.localeCompare(b.log_date); });

  return {
    logs: logs.map(function (l) {
      return { id: l.id, log_date: l.log_date, weight_kg: Number(l.weight_kg) };
    }),
  };
}

function handleAddWeightLog_(auth, body) {
  if (!body.logDate) apiError_(400, 'Data della misurazione obbligatoria.');
  if (body.weightKg === undefined || body.weightKg === null || Number(body.weightKg) <= 0) {
    apiError_(400, 'Peso non valido.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var log = upsertWeightLog_(auth.userId, body.logDate, body.weightKg);

    // Sincronizza il peso corrente nel profilo se questa è la misurazione più recente
    var allLogs = readTable_(SHEET_NAMES.BODY_WEIGHT_LOGS).filter(function (l) {
      return Number(l.user_id) === Number(auth.userId);
    });
    var latestDate = allLogs.reduce(function (max, l) { return l.log_date > max ? l.log_date : max; }, '');
    if (latestDate === body.logDate) {
      updateRowById_(SHEET_NAMES.USERS, auth.userId, { weight_kg: body.weightKg });
    }

    return { log: log };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteWeightLog_(auth, logId) {
  var log = findById_(SHEET_NAMES.BODY_WEIGHT_LOGS, logId);
  if (!log || Number(log.user_id) !== Number(auth.userId)) apiError_(404, 'Misurazione non trovata.');

  deleteRowById_(SHEET_NAMES.BODY_WEIGHT_LOGS, logId);
  return { deleted: true };
}

/** Inserisce o aggiorna (upsert) la misurazione di una data specifica per un utente. */
function upsertWeightLog_(userId, logDate, weightKg) {
  var existing = readTable_(SHEET_NAMES.BODY_WEIGHT_LOGS).filter(function (l) {
    return Number(l.user_id) === Number(userId) && l.log_date === logDate;
  });

  if (existing.length > 0) {
    var updated = updateRowById_(SHEET_NAMES.BODY_WEIGHT_LOGS, existing[0].id, { weight_kg: weightKg });
    return { id: updated.id, log_date: updated.log_date, weight_kg: Number(updated.weight_kg) };
  }

  var id = nextId_(SHEET_NAMES.BODY_WEIGHT_LOGS);
  var record = { id: id, user_id: userId, log_date: logDate, weight_kg: weightKg };
  insertRow_(SHEET_NAMES.BODY_WEIGHT_LOGS, record);
  return { id: id, log_date: logDate, weight_kg: Number(weightKg) };
}
