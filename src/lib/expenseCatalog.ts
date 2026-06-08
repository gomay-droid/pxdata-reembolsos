/** Linhas de despesa e contas contábeis (aba CCS da planilha PX). */
export const EXPENSE_LINE_TO_ACCOUNT_CODE = {
  ALIMENTAÇÃO: "42020600016",
  ESTACIONAMENTO: "42020600016",
  PASSAGENS: "42020600016",
  PEDÁGIO: "42020600016",
  TRANSPORTE: "42020600016",
  HOSPEDAGEM: "42020600016",
  "MATERIAL DE ESCRITÓRIO": "42020300004",
  "MATERIAL DE PUBLICIDADE": "42020300004",
  TELEFONIA: "42020200008",
  "DOMÍNIOS GO DADDY": "41010100002",
  "LICENCIAMENTO CANVA": "42010300001",
  "LICENCIAMENTO CHAT GPT": "42060100002",
  "LICENCIAMENTO CLICKUP": "42020400002",
  "LICENCIAMENTO CURSOR": "42060100002",
  "LICENCIAMENTO DOCUSIGN": "42020400002",
  "LICENCIAMENTO FIGMA": "42060100002",
  "LICENCIAMENTO GITHUB": "42060100002",
  "LICENCIAMENTO GOOGLE INTERNET": "42020400002",
  "LICENCIAMENTO GOOGLE CLOUD": "41010100002",
  "LICENCIAMENTO HUBSPOT": "42010300001",
  "LICENCIAMENTO LINKEDIN": "42010300001",
  "LICENCIAMENTO LOVABLE": "42060100002",
  "LICENCIAMENTO OPEN AI": "41010100002",
  "LICENCIAMENTO POSTMAN": "42060100002",
  "LICENCIAMENTO SONARCLOUD": "42060100002",
} as const;

export type ExpenseLineCatalog = keyof typeof EXPENSE_LINE_TO_ACCOUNT_CODE;

export const EXPENSE_LINES = Object.keys(EXPENSE_LINE_TO_ACCOUNT_CODE) as ExpenseLineCatalog[];

export const ACCOUNT_CODES = [
  ...new Set(Object.values(EXPENSE_LINE_TO_ACCOUNT_CODE)),
].sort() as string[];

/** Conta contábil padrão para assinaturas de software (aba CCS da PX). */
export const SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE = "42060100002";

export function isCatalogExpenseLine(line: string): boolean {
  return line in EXPENSE_LINE_TO_ACCOUNT_CODE;
}

export function buildSoftwareLicenseLine(vendorOrProduct: string): string {
  const cleaned = vendorOrProduct
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
  return `LICENCIAMENTO ${cleaned}`;
}

export function accountCodeForExpenseLine(
  line: string,
  dynamicLines: Record<string, string> = {}
): string {
  if (isCatalogExpenseLine(line)) {
    return EXPENSE_LINE_TO_ACCOUNT_CODE[line as ExpenseLineCatalog];
  }
  return dynamicLines[line] ?? "";
}

/** Linhas do catálogo + linhas criadas automaticamente na sessão (ex.: LICENCIAMENTO ANTHROPIC). */
export function getMergedExpenseLines(dynamicLines: Record<string, string> = {}): string[] {
  const extra = Object.keys(dynamicLines).filter((line) => !isCatalogExpenseLine(line));
  return [...EXPENSE_LINES, ...extra];
}

/** Garante que a linha já selecionada apareça no Select (Radix exige valor na lista). */
export function expenseLineOptionsWithCurrent(
  options: string[],
  current?: string | null
): string[] {
  const value = current?.trim();
  if (!value || options.includes(value)) return options;
  return [...options, value];
}

export function getMergedAccountCodes(dynamicLines: Record<string, string> = {}): string[] {
  const codes = new Set<string>([...ACCOUNT_CODES, ...Object.values(dynamicLines)]);
  return [...codes].sort();
}

export function resolveAccountCodeForLine(
  line: string,
  dynamicLines: Record<string, string> = {}
): string {
  const fromCatalog = accountCodeForExpenseLine(line);
  if (fromCatalog) return fromCatalog;
  return dynamicLines[line] ?? "";
}

/** Usa conta salva no banco ou deriva da linha de despesa (código numérico CCS). */
export function resolveExpenseAccountCode(
  expenseLine: string,
  storedAccountCode?: string | null
): string {
  const stored = storedAccountCode?.trim();
  if (stored && /^\d+$/.test(stored.replace(/\D/g, ""))) {
    return stored.replace(/\D/g, "");
  }
  return accountCodeForExpenseLine(expenseLine);
}
