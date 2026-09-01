import { apiUrl } from "@/lib/apiBase";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Consulta `/api/auth/is-admin` com até 2 novas tentativas (500ms e 1s)
 * quando a primeira falha por rede, proxy ou HTTP não-OK.
 * Resposta 200 com `{ isAdmin }` encerra na hora — inclusive `false` real.
 */
export async function fetchIsAdmin(): Promise<boolean> {
  const extraDelaysMs = [500, 1000];
  const maxAttempts = 1 + extraDelaysMs.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(extraDelaysMs[attempt - 1]!);
    }
    try {
      const res = await fetch(apiUrl("/api/auth/is-admin"), { credentials: "include" });
      if (!res.ok) continue;
      const data = (await res.json()) as { isAdmin?: boolean };
      return Boolean(data.isAdmin);
    } catch {
      /* falha de rede / JSON — tenta de novo */
    }
  }

  return false;
}
