/** Fluxo de upload inteligente: estado por comprovante (ausente = linha adicionada manualmente). */
export type ExpenseReceiptProcessingStatus = "processing" | "extracted" | "error";

export interface Expense {
  id: number;
  description: string;
  expenseLine: string;
  accountCode: string;
  amount: string;
  /** Valor original em dólar (quando identificado). Mantém espaço para futura conversão cambial. */
  amountUsd?: string;
  /** CNPJ do fornecedor extraído automaticamente (editável). */
  supplierCnpj?: string;
  /** Permite confirmar ausência de CNPJ quando não consta na nota. */
  supplierCnpjConfirmed?: boolean;
  /** Comprovante exclusivo desta linha (enviado no FormData na mesma ordem das despesas). */
  attachment: File | null;
  /** Informações adicionais sobre a despesa (opcional). */
  observation?: string;
  /** Presente quando o item veio do upload em massa ou anexo único com pipeline de extração. */
  receiptProcessingStatus?: ExpenseReceiptProcessingStatus;
  /** Mensagem amigável quando status é erro. */
  receiptProcessingMessage?: string;
}

/** Limite alinhado ao multer do servidor (15 MB). */
export const RECEIPT_MAX_FILE_BYTES = 15 * 1024 * 1024;

export const RECEIPT_ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

/** Valida comprovante para upload; retorna mensagem de erro ou null se ok. */
export function validateReceiptFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const extOk = /\.(pdf|jpe?g|png)$/.test(name);
  const mimeOk =
    file.type === "" ||
    file.type === "application/pdf" ||
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/jpg";
  if (!extOk && !mimeOk) {
    return "Use PDF, JPG ou PNG.";
  }
  if (file.size > RECEIPT_MAX_FILE_BYTES) {
    return "Arquivo acima de 15 MB.";
  }
  return null;
}

export interface ReimbursementFormData {
  requesterName: string;
  requesterAddress: string;
  requesterDocument: string;
  requesterEmail: string;
  expenses: Expense[];
}

export interface Reimbursement {
  id: string;
  requesterName: string;
  requesterEmail: string;
  totalAmount: number;
  expenseCount: number;
  status: "enviado" | "aprovado" | "rejeitado";
  createdAt: string;
}

/** Sugestões opcionais para o campo descrição (datalist no formulário). */
export const AI_PROGRAM_OPTIONS = [
  "Aider",
  "Amazon CodeWhisperer",
  "Amazon Q Developer",
  "Ask Codi",
  "Blackbox AI",
  "Bolt.new",
  "ChatGPT (OpenAI)",
  "Claude (Anthropic)",
  "Codeium",
  "CodeRabbit",
  "Continue",
  "Cursor",
  "Gemini Code Assist (Google)",
  "GitHub Copilot",
  "Google Antigravity",
  "JetBrains AI Assistant",
  "Microsoft Copilot",
  "Perplexity",
  "Phind",
  "Pieces",
  "Replit Ghostwriter",
  "Sourcegraph Cody",
  "Supermaven",
  "Tabnine",
  "v0 (Vercel)",
  "Windsurf (Codeium IDE)",
  "Zed",
  "Outros (não listado)",
];

export {
  EXPENSE_LINES,
  ACCOUNT_CODES,
  EXPENSE_LINE_TO_ACCOUNT_CODE,
  SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE,
  accountCodeForExpenseLine,
  buildSoftwareLicenseLine,
  getMergedAccountCodes,
  getMergedExpenseLines,
  isCatalogExpenseLine,
  resolveAccountCodeForLine,
  resolveExpenseAccountCode,
} from "@/lib/expenseCatalog";
export type { ExpenseLineCatalog } from "@/lib/expenseCatalog";
