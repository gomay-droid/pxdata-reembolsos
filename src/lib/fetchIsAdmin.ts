import { apiUrl } from "@/lib/apiBase";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function shouldRetryHttp(status: number): boolean {
  return status === 401 || status === 408 || status === 429 || status >= 500;
}

/**
 * GET/POST com até 2 novas tentativas (500ms e 1s) em falha de rede,
 * 401 (sessão ainda não pronta) e 5xx/429.
 */
export async function fetchWithRetry(
  path: string,
  init: RequestInit = {},
  extraDelaysMs: number[] = [500, 1000]
): Promise<Response> {
  const maxAttempts = 1 + extraDelaysMs.length;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      if (init.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      await sleep(extraDelaysMs[attempt - 1]!);
    }
    try {
      const res = await fetch(apiUrl(path), {
        credentials: "include",
        ...init,
      });
      if (res.ok) return res;
      if (shouldRetryHttp(res.status) && attempt < maxAttempts - 1) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (error) {
      if (isAbortError(error)) throw error;
      lastError = error;
      if (attempt === maxAttempts - 1) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Falha de rede");
}

/**
 * Consulta `/api/auth/is-admin` com retry.
 * Resposta 200 com `{ isAdmin }` encerra na hora — inclusive `false` real.
 */
export async function fetchIsAdmin(): Promise<boolean> {
  try {
    const res = await fetchWithRetry("/api/auth/is-admin");
    if (!res.ok) return false;
    const data = (await res.json()) as { isAdmin?: boolean };
    return Boolean(data.isAdmin);
  } catch {
    return false;
  }
}
