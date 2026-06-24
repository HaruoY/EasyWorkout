/**
 * Handlers_Auth.gs
 */

function handleRegister_(body) {
  var email = (body.email || '').trim().toLowerCase();
  var password = body.password || '';
  var name = (body.name || '').trim();

  if (!email || email.indexOf('@') === -1) apiError_(400, 'Email non valida.');
  if (password.length < 8) apiError_(400, 'La password deve contenere almeno 8 caratteri.');
  if (!name) apiError_(400, 'Il nome è obbligatorio.');

  // Sezione critica: lock per evitare race condition su email duplicate con scritture concorrenti
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var existing = readTable_(SHEET_NAMES.USERS).filter(function (u) { return u.email === email; });
    if (existing.length > 0) apiError_(409, 'Esiste già un account con questa email.');

    var salt = generateSalt_();
    var passwordHash = hashPassword_(password, salt);
    var id = nextId_(SHEET_NAMES.USERS);

    var user = {
      id: id,
      email: email,
      password_hash: passwordHash,
      password_salt: salt,
      name: name,
      sex: '',
      birth_date: '',
      height_cm: '',
      weight_kg: '',
      activity_level: 'moderate',
      goal: 'maintain',
      formula: 'mifflin_st_jeor',
      created_at: new Date().toISOString(),
    };
    insertRow_(SHEET_NAMES.USERS, user);

    var token = issueToken_(id, email);
    return { token: token, user: publicUser_(user) };
  } finally {
    lock.releaseLock();
  }
}

function handleLogin_(body) {
  var email = (body.email || '').trim().toLowerCase();
  var password = body.password || '';

  if (!email) apiError_(400, 'Email non valida.');
  if (!password) apiError_(400, 'Password obbligatoria.');

  var users = readTable_(SHEET_NAMES.USERS).filter(function (u) { return u.email === email; });
  if (users.length === 0) apiError_(401, 'Credenziali non valide.');

  var user = users[0];
  if (!verifyPassword_(password, user.password_salt, user.password_hash)) {
    apiError_(401, 'Credenziali non valide.');
  }

  var token = issueToken_(user.id, user.email);
  return { token: token, user: publicUser_(user) };
}

/** Rimuove i campi sensibili (hash, salt) prima di restituire l'utente al client. */
function publicUser_(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    sex: user.sex || null,
    birth_date: user.birth_date || null,
    height_cm: user.height_cm === '' ? null : user.height_cm,
    weight_kg: user.weight_kg === '' ? null : user.weight_kg,
    activity_level: user.activity_level,
    goal: user.goal,
    formula: user.formula,
  };
}
