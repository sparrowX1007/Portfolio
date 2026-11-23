import { API_BASE } from '../api/client.js';
export { API_BASE };

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.name = 'ApiError'; this.status = status; }
}

export async function sendRequest(path, { method = 'GET', body, csrfToken, signal } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (csrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) headers.set('X-CSRF-Token', csrfToken);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Impossible de joindre l’API. Vérifie que le backend est lancé.');
  }
  if (response.status === 204) return null;
  let data = null;
  try { data = await response.json(); } catch { /* response has no JSON body */ }
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : 'La requête a échoué.';
    throw new ApiError(detail, response.status);
  }
  return data;
}
