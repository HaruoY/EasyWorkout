/**
 * Client per il backend Google Apps Script.
 *
 * Apps Script Web App non supporta header CORS personalizzati su ContentService,
 * quindi evitiamo qualunque cosa che faccia scattare una richiesta preflight (OPTIONS):
 * - niente header Authorization custom → il token viaggia nel body/query
 * - Content-Type 'text/plain' invece di 'application/json' sui POST
 *   (Apps Script effettua comunque il parsing JSON lato server tramite e.postData.contents)
 *
 * Tutte le chiamate passano per un unico endpoint con un parametro `action`.
 */

const GAS_URL = import.meta.env.VITE_GAS_URL || '';

function getToken(): string | null {
  return localStorage.getItem('token');
}

interface ApiError {
  error: string;
}

async function callAction<T>(
  action: string,
  payload: Record<string, any> = {},
  method: 'GET' | 'POST' = 'POST'
): Promise<T> {
  if (!GAS_URL) {
    throw new Error("VITE_GAS_URL non configurato. Imposta l'URL della Web App Apps Script.");
  }

  const token = getToken();
  const body = { ...payload, token };

  let response: Response;

  if (method === 'GET') {
    const params = new URLSearchParams({ action, ...flattenParams(body) });
    response = await fetch(`${GAS_URL}?${params.toString()}`, { method: 'GET' });
  } else {
    const params = new URLSearchParams({ action });
    response = await fetch(`${GAS_URL}?${params.toString()}`, {
      method: 'POST',
      // text/plain evita il preflight CORS; Apps Script fa comunque JSON.parse() lato server
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    });
  }

  const data = await response.json();

  if (!response.ok || data.error) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const err: ApiError = data.error ? data : { error: 'Errore di rete o risposta non valida.' };
    throw new Error(err.error);
  }

  return data as T;
}

/** Converte un oggetto piatto in stringhe per la query string (solo per GET semplici). */
function flattenParams(obj: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined && obj[key] !== null && typeof obj[key] !== 'object') {
      result[key] = String(obj[key]);
    }
  });
  return result;
}

const api = {
  post: <T = any>(action: string, payload: Record<string, any> = {}) => callAction<T>(action, payload, 'POST'),
  get: <T = any>(action: string, payload: Record<string, any> = {}) => callAction<T>(action, payload, 'GET'),
};

export default api;
