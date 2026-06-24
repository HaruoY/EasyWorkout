/**
 * Handlers_Profile.gs
 */

function handleGetProfile_(auth) {
  var user = findById_(SHEET_NAMES.USERS, auth.userId);
  if (!user) apiError_(404, 'Utente non trovato.');
  return { user: publicUser_(user) };
}

function handleUpdateProfile_(auth, body) {
  var patch = {};
  var allowedFields = {
    name: 'name',
    sex: 'sex',
    birthDate: 'birth_date',
    heightCm: 'height_cm',
    weightKg: 'weight_kg',
    activityLevel: 'activity_level',
    goal: 'goal',
    formula: 'formula',
  };

  Object.keys(allowedFields).forEach(function (clientKey) {
    if (body[clientKey] !== undefined) patch[allowedFields[clientKey]] = body[clientKey];
  });

  if (Object.keys(patch).length === 0) apiError_(400, 'Nessun campo da aggiornare.');

  var updated = updateRowById_(SHEET_NAMES.USERS, auth.userId, patch);
  if (!updated) apiError_(404, 'Utente non trovato.');

  // Se viene aggiornato il peso, registra anche nello storico pesi (upsert sulla data odierna)
  if (body.weightKg !== undefined) {
    var today = new Date().toISOString().slice(0, 10);
    upsertWeightLog_(auth.userId, today, body.weightKg);
  }

  return { user: publicUser_(updated) };
}

function handleGetCalorieNeeds_(auth) {
  var user = findById_(SHEET_NAMES.USERS, auth.userId);
  if (!user) apiError_(404, 'Utente non trovato.');

  var result = calculateCalorieNeeds_(user);
  if (!result) {
    apiError_(
      400,
      'Dati biometrici incompleti. Compila sesso, data di nascita, altezza e peso nel profilo prima di calcolare il fabbisogno calorico.'
    );
  }
  return result;
}
