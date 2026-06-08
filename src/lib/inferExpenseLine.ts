import {
  accountCodeForExpenseLine,
  buildSoftwareLicenseLine,
  isCatalogExpenseLine,
  SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE,
} from "./expenseCatalog";

const EXPENSE_LINE_KEYWORDS: Array<{ line: string; re: RegExp }> = [
  { line: "TRANSPORTE", re: /\b(uber|99|taxi|cabify|corrida|combust[ií]vel|posto)\b/i },
  { line: "PEDÁGIO", re: /\bped[aá]gio\b/i },
  { line: "ESTACIONAMENTO", re: /\bestacionamento\b/i },
  { line: "PASSAGENS", re: /\b(passagem|voo|a[ée]reo|rodovi[aá]ria)\b/i },
  { line: "ALIMENTAÇÃO", re: /\b(restaurante|lanchonete|almo[cç]o|jantar|caf[eé]|ifood|lanche)\b/i },
  { line: "HOSPEDAGEM", re: /\b(hotel|hospedagem|pousada|booking|airbnb|di[aá]ria)\b/i },
  { line: "MATERIAL DE ESCRITÓRIO", re: /\b(papelaria|material|escrit[oó]rio|caneta|impress[aã]o)\b/i },
  { line: "TELEFONIA", re: /\b(telefone|celular|telefonia)\b/i },
  { line: "LICENCIAMENTO CURSOR", re: /\bcursor\b/i },
  { line: "LICENCIAMENTO OPEN AI", re: /\b(openai|chat\s*gpt|gpt-4|gpt-3)\b/i },
  { line: "LICENCIAMENTO CHAT GPT", re: /\bchatgpt\b/i },
  { line: "LICENCIAMENTO FIGMA", re: /\bfigma\b/i },
  { line: "LICENCIAMENTO GITHUB", re: /\bgithub\b/i },
  { line: "LICENCIAMENTO GOOGLE CLOUD", re: /\bgoogle cloud\b/i },
  { line: "LICENCIAMENTO GOOGLE INTERNET", re: /\bgoogle workspace|g suite\b/i },
  { line: "LICENCIAMENTO CANVA", re: /\bcanva\b/i },
  { line: "LICENCIAMENTO CLICKUP", re: /\bclickup\b/i },
  { line: "LICENCIAMENTO HUBSPOT", re: /\bhubspot\b/i },
  { line: "LICENCIAMENTO POSTMAN", re: /\bpostman\b/i },
  { line: "LICENCIAMENTO SONARCLOUD", re: /\bsonarcloud\b/i },
  { line: "LICENCIAMENTO DOCUSIGN", re: /\bdocusign\b/i },
  { line: "LICENCIAMENTO LOVABLE", re: /\blovable\b/i },
  { line: "LICENCIAMENTO LINKEDIN", re: /\blinkedin\b/i },
  { line: "DOMÍNIOS GO DADDY", re: /\b(go\s?daddy|godaddy)\b/i },
];

const DYNAMIC_SOFTWARE_VENDOR_HINTS: Array<{ re: RegExp; label: string }> = [
  { re: /\bclaude\b/i, label: "CLAUDE" },
  { re: /\banthropic\b/i, label: "ANTHROPIC" },
  { re: /\bnotion\b/i, label: "NOTION" },
  { re: /\bslack\b/i, label: "SLACK" },
  { re: /\bzoom\b/i, label: "ZOOM" },
  { re: /\blinear\b/i, label: "LINEAR" },
  { re: /\bvercel\b/i, label: "VERCEL" },
  { re: /\bnetlify\b/i, label: "NETLIFY" },
  { re: /\bstripe\b/i, label: "STRIPE" },
  { re: /\batlassian\b/i, label: "ATLASSIAN" },
  { re: /\bjira\b/i, label: "JIRA" },
  { re: /\bconfluence\b/i, label: "CONFLUENCE" },
  { re: /\bmiro\b/i, label: "MIRO" },
  { re: /\b1password\b/i, label: "1PASSWORD" },
  { re: /\blastpass\b/i, label: "LASTPASS" },
  { re: /\bcodeium\b/i, label: "CODEIUM" },
  { re: /\bwindsurf\b/i, label: "WINDSURF" },
  { re: /\bcopilot\b/i, label: "COPILOT" },
  { re: /\bgemini\b/i, label: "GEMINI" },
  { re: /\bperplexity\b/i, label: "PERPLEXITY" },
];

function looksLikeSoftwareSubscription(haystack: string): boolean {
  return (
    /\b(subscription|assinatura|saas|license|licen[cç]a|software)\b/i.test(haystack) ||
    (/\b(invoice|fatura|receipt|recibo|nota)\b/i.test(haystack) &&
      /\b(pro|plus|premium|team|enterprise|monthly|anual|annual)\b/i.test(haystack))
  );
}

function inferDynamicSoftwareLicenseLine(text: string, filename: string): string | null {
  const haystack = `${text}\n${filename}`;
  const hasSoftwareSignal =
    looksLikeSoftwareSubscription(haystack) ||
    DYNAMIC_SOFTWARE_VENDOR_HINTS.some((h) => h.re.test(haystack));

  if (!hasSoftwareSignal) return null;

  for (const { re, label } of DYNAMIC_SOFTWARE_VENDOR_HINTS) {
    if (!re.test(haystack)) continue;
    const line = buildSoftwareLicenseLine(label);
    if (!isCatalogExpenseLine(line)) return line;
  }

  const proMatch = haystack.match(/\b([A-Za-z][A-Za-z0-9.+\-]{1,24})\s+Pro\b/);
  if (proMatch) {
    const line = buildSoftwareLicenseLine(proMatch[1]);
    if (!isCatalogExpenseLine(line)) return line;
  }

  return null;
}

/** Infere linha CCS a partir do texto do comprovante, descrição ou nome do arquivo. */
export function inferExpenseLineFromText(text: string, filename = ""): string | null {
  const haystack = `${text}\n${filename}`;
  for (const entry of EXPENSE_LINE_KEYWORDS) {
    if (entry.re.test(haystack)) return entry.line;
  }
  return inferDynamicSoftwareLicenseLine(text, filename);
}

export function accountCodeForInferredLine(line: string): string {
  if (isCatalogExpenseLine(line)) return accountCodeForExpenseLine(line);
  return SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE;
}

export function inferExpenseLineWithAccount(
  text: string,
  filename = ""
): { line: string; accountCode: string } | null {
  const line = inferExpenseLineFromText(text, filename);
  if (!line) return null;
  return { line, accountCode: accountCodeForInferredLine(line) };
}
