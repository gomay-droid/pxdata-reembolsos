/**
 * Em produção na Vercel o front é estático; a API fica em outro host.
 * Defina `VITE_API_BASE_URL` (ex.: https://api.seudominio.com) sem barra no final.
 * Em dev, deixe vazio e use o proxy do Vite (`/api` → localhost:3001).
 */
/**
 * Sem `https://`, o browser trata o valor como caminho relativo no domínio da Vercel → 405 em /api/...
 * Aceita também valor colado com aspas acidentais.
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

/** Em produção no browser usamos `/api` same-origin (proxy Vercel). BASE direto é opcional. */
export function productionApiBaseMissingMessage(): string | null {
  return null;
}

/**
 * Em produção no browser, prefira `/api` no mesmo domínio (Vercel faz proxy → Railway).
 * Cookies de sessão só persistem de forma confiável no mobile quando a API é same-origin.
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

/** Links para arquivos servidos pela API (`/uploads/...`). */
export function assetUrl(path: string): string {
  return apiUrl(path);
}
