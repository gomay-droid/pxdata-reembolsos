/**
 * Em produção na Vercel o front é estático; a API fica em outro host (Railway).
 * Defina `VITE_API_BASE_URL` (ex.: https://seu-app.up.railway.app) sem barra no final.
 * Em dev, deixe vazio e use o proxy do Vite (`/api` → localhost:3001).
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

/** Em produção, sem base a API cai em /api no domínio da Vercel → 405 (SPA rewrite). */
export function productionApiBaseMissingMessage(): string | null {
  if (!import.meta.env.PROD || BASE) return null;
  return (
    "Em produção falta VITE_API_BASE_URL na Vercel: coloque a URL HTTPS pública do serviço " +
    "no Railway (Settings → Networking), sem barra no final, marque Production e faça Redeploy."
  );
}

export function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!path.startsWith("/")) {
    throw new Error(`apiUrl: use path absoluto (ex.: /api/...), recebido: ${path}`);
  }
  return BASE ? `${BASE}${path}` : path;
}

/**
 * Callback do Google Sign-In (redirect no mobile).
 * Deve estar em "URIs de redirecionamento autorizados" no Google Cloud Console.
 */
export function googleAuthCallbackUrl(): string {
  if (BASE) return `${BASE}/api/auth/google/callback`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth/google/callback`;
  }
  return "/api/auth/google/callback";
}

/** Links para arquivos servidos pela API (`/uploads/...`). */
export function assetUrl(path: string): string {
  return apiUrl(path);
}
