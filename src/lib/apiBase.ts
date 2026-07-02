/**
 * Em produção na Vercel, `/api` é proxy same-origin → Railway (vercel.json).
 * Em dev, deixe VITE_API_BASE_URL vazio e use o proxy do Vite.
 */
function normalizeBase(raw: string | undefined): string {
  if (!raw?.trim()) return "";
  let s = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/$/, "");
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  return s;
}

const BASE = normalizeBase(import.meta.env.VITE_API_BASE_URL as string | undefined);

/** URL pública da API (Railway), vazia em dev com proxy local. */
export function getApiBaseUrl(): string {
  return BASE;
}

export function productionApiBaseMissingMessage(): string | null {
  return null;
}

/**
 * No browser em produção usa `/api` no mesmo domínio (Vercel → Railway).
 * Evita cookies cross-site bloqueados no Safari/iOS.
 */
export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!path.startsWith("/")) {
    throw new Error(`apiUrl: use path absoluto (ex.: /api/...), recebido: ${path}`);
  }
  if (import.meta.env.PROD && typeof window !== "undefined") {
    return path;
  }
  return BASE ? `${BASE}${path}` : path;
}

/**
 * Callback do Google Sign-In (redirect no mobile).
 * Sempre no domínio do front (Vercel), que faz proxy para a API.
 */
export function googleAuthCallbackUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth/google/callback`;
  }
  if (BASE) return `${BASE}/api/auth/google/callback`;
  return "/api/auth/google/callback";
}

/** Links para arquivos servidos pela API (`/uploads/...`). */
export function assetUrl(path: string): string {
  return apiUrl(path);
}
