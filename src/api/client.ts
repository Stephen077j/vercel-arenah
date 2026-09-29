// VITE_API_URL vide ("") = même domaine que le site (derrière le proxy Nginx/Caddy).
// Non défini = serveur de développement local.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('arenah_token');
}

export function setToken(token: string): void {
  localStorage.setItem('arenah_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('arenah_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown = {}) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  // Certaines routes DELETE attendent un corps (ex. /api/push/unsubscribe,
  // qui identifie l'abonnement par son endpoint).
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};
