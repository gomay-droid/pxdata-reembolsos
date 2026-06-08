import { PDFParse } from "pdf-parse";
import { createWorker } from "tesseract.js";
import {
  accountCodeForInferredLine,
  inferExpenseLineFromText,
} from "../src/lib/inferExpenseLine.ts";

export async function extractTextFromBuffer(
  buffer: Buffer,
  mime: string
): Promise<{ text: string; method: string }> {
  if (mime === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return { text: result.text ?? "", method: "pdf-text" };
    } finally {
      await parser.destroy();
    }
  }

  if (mime === "image/jpeg" || mime === "image/png") {
    const worker = await createWorker("por+eng");
    try {
      const { data } = await worker.recognize(buffer);
      return { text: data.text ?? "", method: "ocr-tesseract" };
    } finally {
      await worker.terminate();
    }
  }

  throw new Error("Tipo de arquivo não suportado (use PDF, JPEG ou PNG)");
}

/** Normaliza texto vindo de PDF (espaços especiais, quebras). */
function normalizePdfText(text: string): string {
  return text
    .replace(/\u00A0/g, " ")
    .replace(/[\u2007\u202F]/g, " ")
    .replace(/[ \t]+/g, " ");
}

/** Palpites genéricos (extrato / print) — regex simples. */
export function buildExtractionHints(text: string) {
  const t = normalizePdfText(text);
  const reais = [...t.matchAll(/R\$\s*[\d.,]+/gi)].map((m) => m[0]);
  const dates = [...t.matchAll(/\b\d{2}\/\d{2}\/\d{4}\b/g)].map((m) => m[0]);
  const isoDates = [...t.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)].map((m) => m[0]);
  const times = [...t.matchAll(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g)].map((m) => m[0]);
  const uniq = (xs: string[], n = 30) => [...new Set(xs)].slice(0, n);

  return {
    reais: uniq(reais),
    dates: uniq([...dates, ...isoDates]),
    times: uniq(times),
    charCount: text.length,
  };
}

/** `$` faz parte de `R$`? (evita tratar R$110.00 como USD 110.00) */
function isDollarSignForUsd(text: string, dollarIndex: number): boolean {
  return dollarIndex <= 0 || text[dollarIndex - 1] !== "R";
}

/** Extrai tokens USD do texto ($ / US$), ignorando o `$` de valores em real (R$). */
function collectUsdTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/US\$\s*[\d.,]+/gi)) out.push(m[0]);
  for (const m of text.matchAll(/\$\s*[\d,]+\.\d{2}\b/g)) {
    if (m.index != null && !isDollarSignForUsd(text, m.index)) continue;
    out.push(m[0].trim());
  }
  for (const m of text.matchAll(/\b([\d,]+\.\d{2})\s*USD\b/gi)) {
    out.push("$" + m[1].replace(/,/g, ""));
  }
  return [...new Set(out.map((x) => x.replace(/\s+/g, " ").trim()))];
}

/**
 * BRL: suporta formato brasileiro (1.234,56) e faturas internacionais com R$ e ponto decimal (R$110.00).
 */
function brlToNumber(token: string): number | null {
  const s = token.replace(/R\$\s*/gi, "").replace(/\s/g, "").trim();
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  // Brasileiro: vírgula decimal (ex.: 1.234,56)
  if (lastComma !== -1 && lastComma > lastDot && /,\d{1,2}$/.test(s)) {
    const intPart = s.slice(0, lastComma).replace(/\./g, "");
    const dec = s.slice(lastComma + 1);
    if (!/^\d{1,2}$/.test(dec)) return null;
    const n = parseFloat(`${intPart}.${dec.padEnd(2, "0").slice(0, 2)}`);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // Ponto decimal (ex.: R$110.00, 1,234.56 em nota internacional)
  if (lastDot !== -1 && /\.\d{1,2}$/.test(s)) {
    if (lastComma !== -1 && lastComma < lastDot) {
      const n = parseFloat(s.replace(/,/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    if (lastComma === -1) {
      if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
        const n = parseFloat(s.replace(/\./g, ""));
        return Number.isFinite(n) && n > 0 ? n : null;
      }
      const n = parseFloat(s);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }

  if (lastComma === -1 && lastDot === -1 && /^\d+$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  return null;
}

/** USD: $20.00, US$ 20.00 — nunca R$ */
function usdToNumber(token: string): number | null {
  if (/^R\$/i.test(token.trim())) return null;
  const cleaned = token.replace(/US\$/gi, "$").trim();
  const m = cleaned.match(/\$\s*([\d,]+)\.(\d{2})\b/);
  if (!m) return null;
  const intPart = m[1].replace(/,/g, "");
  const n = parseFloat(`${intPart}.${m[2]}`);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseMoneyToken(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^R\$/i.test(t)) return brlToNumber(t);
  if (/US\$/i.test(t)) return usdToNumber(t);
  if (/\$\s*[\d,]+\.\d{2}/.test(t)) return usdToNumber(t);
  return brlToNumber(t);
}

function isLikelyYearOnly(n: number): boolean {
  return Number.isInteger(n) && n >= 1990 && n <= 2100;
}

/**
 * Coleta strings monetárias (BRL e USD) para palpites e escolha do total.
 */
function collectMoneyTokens(text: string): string[] {
  const t = normalizePdfText(text);
  const out: string[] = [];

  for (const m of t.matchAll(/R\$\s*[\d.,]+/gi)) out.push(m[0]);
  out.push(...collectUsdTokens(t));

  // Valor brasileiro sem R$: 1.234,56 ou 119,00 (evita pegar só ano de 4 dígitos)
  for (const m of t.matchAll(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g)) {
    const s = m[0];
    const n = brlToNumber(s);
    if (n !== null && !isLikelyYearOnly(n)) out.push(s);
  }

  return [...new Set(out.map((x) => x.replace(/\s+/g, " ").trim()))];
}

/**
 * Heurísticas extras para PDFs de cobrança/fatura (ex.: licenças): tenta um valor “principal”
 * e uma data/hora a partir do texto já extraído.
 */
export function buildPdfBillingHints(text: string) {
  const normalized = normalizePdfText(text);
  const generic = buildExtractionHints(text);
  const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const moneyTokens = collectMoneyTokens(text);
  const amounts = moneyTokens
    .map((tok) => ({ tok, n: parseMoneyToken(tok) }))
    .filter((x): x is { tok: string; n: number } => x.n !== null && x.n > 0);

  const keywordRegex =
    /\b(total|amount\s*due|amount|balance\s*due|valor|due|pagamento|subtotal|charged|charge|paid|pago|invoice\s*total)\b/i;

  let suggestedTotal: string | null = null;
  const keywordLine = lines.find((line) => keywordRegex.test(line) && /[\d.,$]/.test(line));
  if (keywordLine) {
    const subTokens: string[] = [];
    for (const m of keywordLine.matchAll(/R\$\s*[\d.,]+/gi)) subTokens.push(m[0]);
    for (const tok of collectUsdTokens(keywordLine)) subTokens.push(tok);
    for (const m of keywordLine.matchAll(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g)) subTokens.push(m[0]);
    const parsed = subTokens.map(parseMoneyToken).filter((n): n is number => n !== null && n > 0);
    if (parsed.length) {
      const best = Math.max(...parsed);
      const tok = subTokens.find((t) => parseMoneyToken(t) === best);
      if (tok) suggestedTotal = tok.replace(/\s+/g, " ");
    }
  }

  if (!suggestedTotal && amounts.length > 0) {
    const filtered = amounts.filter((a) => !isLikelyYearOnly(a.n));
    const pool = filtered.length ? filtered : amounts;
    const max = pool.reduce((a, b) => (b.n > a.n ? b : a));
    if (max.n >= 0.01) suggestedTotal = max.tok.replace(/\s+/g, " ");
  }

  const reaisMerged = [...new Set([...generic.reais, ...moneyTokens])].slice(0, 40);

  let suggestedDateTime: string | null = null;
  const dt1 = normalized.match(
    /(\d{2}\/\d{2}\/\d{4})\s*(?:às|as|,|\s)+\s*(\d{1,2}:\d{2}(?::\d{2})?)/i
  );
  if (dt1) suggestedDateTime = `${dt1[1]} ${dt1[2]}`;
  if (!suggestedDateTime) {
    const iso = normalized.match(
      /(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?)/
    );
    if (iso) suggestedDateTime = `${iso[1]} ${iso[2].replace(/Z$/, " UTC")}`;
  }
  if (!suggestedDateTime) {
    const d = generic.dates[0];
    const tm = generic.times[0];
    if (d && tm) suggestedDateTime = `${d} ${tm}`;
  }

  return {
    ...generic,
    reais: reaisMerged,
    suggestedTotal,
    suggestedDateTime,
  };
}

export function buildHintsByDocKind(text: string, docKind: string, mime: string) {
  const charCount = text.length;

  if (docKind === "nf_foto") {
    return {
      charCount,
      reais: [] as string[],
      dates: [] as string[],
      times: [] as string[],
      manualOnly: true,
      note:
        "Para foto de nota fiscal, o valor e os dados devem ser preenchidos manualmente no reembolso — palpites automáticos desativados.",
    };
  }

  if (mime === "application/pdf" || docKind === "pdf_licenca") {
    return {
      ...buildPdfBillingHints(text),
      manualOnly: false,
    };
  }

  return {
    ...buildExtractionHints(text),
    charCount,
    manualOnly: false,
  };
}

export type ReceiptExtractionResult = {
  description: string | null;
  expenseLine: string | null;
  accountCode: string | null;
  amountBRL: number | null;
  amountUSD: number | null;
  supplierCnpj: string | null;
  confidence: "low" | "medium" | "high";
};

function normalizeDigits(s: string): string {
  return s.replace(/\D+/g, "");
}

function formatCnpjFromText(raw: string): string | null {
  const digits = normalizeDigits(raw);
  if (digits.length !== 14) return null;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function extractCnpj(text: string): string | null {
  const m = text.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
  if (!m) return null;
  return formatCnpjFromText(m[0]);
}

function extractAmountBRL(text: string): number | null {
  const tokens = [...text.matchAll(/R\$\s*[\d.,]+/gi)].map((m) => m[0]);
  const numbers = tokens.map((t) => brlToNumber(t)).filter((n): n is number => n !== null && n > 0);
  if (!numbers.length) return null;
  return Math.max(...numbers);
}

function extractAmountUSD(text: string): number | null {
  const tokens = collectUsdTokens(text);
  const numbers = tokens.map((t) => usdToNumber(t)).filter((n): n is number => n !== null && n > 0);
  if (!numbers.length) return null;
  return Math.max(...numbers);
}

function inferDescription(text: string, filename: string, line: string | null): string {
  if (/\bclaude(\s+pro)?\b/i.test(text)) return "Claude Pro";
  if (/\buber\b/i.test(text)) return "Corrida Uber";
  if (/ifood/i.test(text)) return "Pedido iFood";
  if (/\bhotel|airbnb|booking\b/i.test(text)) return "Hospedagem";
  if (/openai|chatgpt/i.test(text)) return "ChatGPT";
  if (/anthropic/i.test(text)) return "Assinatura Anthropic";
  if (/openai|google|aws|microsoft/i.test(text)) return "Assinatura de software";
  const baseName = filename.replace(/\.[a-z0-9]+$/i, "").trim();
  if (baseName) return baseName;
  return line ? `${line} (nota)` : "Despesa com comprovante";
}

export function buildReceiptExtraction(text: string, filename: string): ReceiptExtractionResult {
  const normalized = normalizePdfText(text);
  let line = inferExpenseLineFromText(normalized, filename);
  const amountBRL = extractAmountBRL(normalized);
  const amountUSD = extractAmountUSD(normalized);
  const supplierCnpj = extractCnpj(normalized);
  const description = inferDescription(normalized, filename, line);
  if (!line && description) {
    line = inferExpenseLineFromText(`${description}\n${normalized}`, filename);
  }
  const accountCode = line ? accountCodeForInferredLine(line) : null;

  let confidence: ReceiptExtractionResult["confidence"] = "low";
  const signals = [amountBRL !== null || amountUSD !== null, Boolean(supplierCnpj), Boolean(line)].filter(
    Boolean
  ).length;
  if (signals >= 3) confidence = "high";
  else if (signals === 2) confidence = "medium";

  return {
    description: description || null,
    expenseLine: line,
    accountCode,
    amountBRL,
    amountUSD,
    supplierCnpj,
    confidence,
  };
}
