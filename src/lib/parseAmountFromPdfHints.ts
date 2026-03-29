/** Resposta parcial de /api/lab/extract — hints de PDF. */
export type LabExtractHints = {
  suggestedTotal?: string | null;
  reais?: string[];
};

function parseBrlLike(s: string): number | null {
  const t = s.replace(/R\$\s*/gi, "").replace(/\s/g, "").trim();
  if (!t) return null;
  const lastComma = t.lastIndexOf(",");
  if (lastComma === -1) {
    const n = parseFloat(t.replace(/\./g, ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const intPart = t.slice(0, lastComma).replace(/\./g, "");
  const dec = t.slice(lastComma + 1);
  if (!/^\d{1,2}$/.test(dec)) return null;
  const n = parseFloat(`${intPart}.${dec.padEnd(2, "0").slice(0, 2)}`);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseUsdLike(s: string): number | null {
  const m = s.match(/\$\s*([\d,]+)\.(\d{2})\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, "") + "." + m[2]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseMoneyToken(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (/\$\s*[\d,]+\.\d{2}/.test(t)) return parseUsdLike(t);
  return parseBrlLike(t);
}

/** Retorna string para `<input type="number" step="0.01">` ou null. */
export function parseAmountFromPdfHints(hints: LabExtractHints): string | null {
  const candidates: number[] = [];

  if (hints.suggestedTotal) {
    const n = parseMoneyToken(hints.suggestedTotal);
    if (n !== null) candidates.push(n);
  }

  if (hints.reais?.length) {
    for (const r of hints.reais) {
      const n = parseMoneyToken(r);
      if (n !== null) candidates.push(n);
    }
  }

  if (candidates.length === 0) return null;

  const looksLikeYear = (n: number) => Number.isInteger(n) && n >= 1990 && n <= 2100;
  const nonYears = candidates.filter((n) => !looksLikeYear(n));
  const pool = nonYears.length ? nonYears : candidates;
  return Math.max(...pool).toFixed(2);
}
