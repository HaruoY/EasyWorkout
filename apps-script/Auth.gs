/**
 * Auth.gs
 *
 * Autenticazione semplificata per Apps Script:
 * - Hashing password: SHA-256 + salt casuale (bcrypt non è disponibile in Apps Script).
 *   Più debole di bcrypt (nessun cost factor configurabile), accettabile per un'app
 *   personale/familiare, non per dati sensibili regolamentati.
 * - Token: stringa casuale opaca salvata in PropertiesService (Script Properties),
 *   non un JWT firmato. Più semplice ma senza scadenza automatica integrata:
 *   la scadenza è verificata manualmente confrontando il timestamp salvato.
 */

var TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni, come nello stack Node originale

/** Genera un salt casuale (16 byte, esadecimale). */
function generateSalt_() {
  var bytes = [];
  for (var i = 0; i < 16; i++) bytes.push(Math.floor(Math.random() * 256));
  return bytes.map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}

/** Calcola SHA-256(password + salt) in esadecimale. */
function hashPassword_(password, salt) {
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.newBlob(password + salt).getBytes()
  );
  return digest.map(function (byte) {
    var v = (byte < 0 ? byte + 256 : byte).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function verifyPassword_(password, salt, expectedHash) {
  return hashPassword_(password, salt) === expectedHash;
}

/** Genera un token opaco casuale (32 byte esadecimali). */
function generateToken_() {
  var bytes = [];
  for (var i = 0; i < 32; i++) bytes.push(Math.floor(Math.random() * 256));
  return bytes.map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}

/** Crea un nuovo token di sessione per l'utente e lo salva con scadenza. */
function issueToken_(userId, email) {
  var token = generateToken_();
  var payload = JSON.stringify({ userId: userId, email: email, expiresAt: Date.now() + TOKEN_TTL_MS });
  PropertiesService.getScriptProperties().setProperty('token_' + token, payload);
  return token;
}

/**
 * Verifica un token: lo decodifica, controlla la scadenza.
 * Ritorna { userId, email } se valido, altrimenti null.
 */
function verifyToken_(token) {
  if (!token) return null;
  var raw = PropertiesService.getScriptProperties().getProperty('token_' + token);
  if (!raw) return null;
  var payload = JSON.parse(raw);
  if (Date.now() > payload.expiresAt) {
    PropertiesService.getScriptProperties().deleteProperty('token_' + token);
    return null;
  }
  return { userId: payload.userId, email: payload.email };
}

/** Estrae il token Bearer dall'header Authorization simulato nei parametri della richiesta. */
function extractToken_(e) {
  var header = (e.parameter && e.parameter.authorization) || '';
  if (header.indexOf('Bearer ') === 0) return header.slice(7);
  return null;
}
