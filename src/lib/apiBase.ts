/**
 * Em produção na Vercel o front é estático; a API fica em outro host.
 * Defina `VITE_API_BASE_URL` (ex.: https://api.seudominio.com) sem barra no final.
 * Em dev, deixe vazio e use o proxy do Vite (`/api` → localhost:3001).
 */
function normalizeBase(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  return raw.trim().replace(/\/$/, "");
}

const BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL as string | undefined);

export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!path.startsWith("/")) {
    throw new Error(`apiUrl: use path absoluto (ex.: /api/...), recebido: ${path}`);
  }
  return BASE ? `${BASE}${path}` : path;
}

/** Links para arquivos servidos pela API (`/uploads/...`). */
export function assetUrl(path: string): string {
  return apiUrl(path);
}
