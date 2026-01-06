// api.js — Configuración de APIs (base url + helper)
export const BASE_URL = 'http://localhost:3000'; // cámbiala según ambiente

/**
 * apiFetch — wrapper con:
 * - JSON por defecto
 * - abort/timeout
 * - manejo de errores consistente
 */
export async function apiFetch(path, { method = 'GET', headers = {}, body, timeout = 12000 } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  const init = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    signal: controller.signal,
  };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);

  let res, data;
  try {
    res = await fetch(`${BASE_URL}${path}`, init);
    const text = await res.text(); // Permite manejar vacíos y JSON inválido
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Inténtalo de nuevo.');
    }
    throw new Error('No se pudo conectar con el servidor.');
  } finally {
    clearTimeout(id);
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      (res.status === 401
        ? 'Usuario o contraseña incorrectos.'
        : res.status === 403
        ? 'Acceso denegado.'
        : res.status >= 500
        ? 'Error del servidor. Intenta más tarde.'
        : 'No se pudo completar la solicitud.');
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}
