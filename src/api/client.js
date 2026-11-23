export const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');
export const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT || 'https://formspree.io/f/xnpdodwg';

export async function getPublicResource(resource, { locale = 'fr', signal } = {}) {
  const response = await fetch(`${API_BASE}/public/${resource}?locale=${locale}`, { signal });
  if (!response.ok) throw new Error(`API ${response.status} · ${resource}`);
  return response.json();
}
