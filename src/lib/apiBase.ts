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

/** Em produção, sem base a API cai em /api no domínio da Vercel → 405 (SPA rewrite). */
export function productionApiBaseMissingMessage(): string | null {
  if (!import.meta.env.PROD || BASE) return null;
  return (
    "Em produção falta VITE_API_BASE_URL na Vercel (Settings → Environment Variables): " +
    "coloque a URL HTTPS da API no Railway (ex.: https://seu-app.up.railway.app), sem barra no final, " +
    "marque Production e faça Redeploy. Sem isso o login quebra com erro 405."
  );
}

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
