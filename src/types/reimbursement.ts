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

export const EXPENSE_LINES = [
  "Viagem",
  "Alimentação",
  "Transporte",
  "Hospedagem",
  "Material de escritório",
  "Software/Assinatura",
  "Comunicação",
  "Outros",
];

export const ACCOUNT_CODES = [
  "4.1.01 - Despesas com viagens",
  "4.1.02 - Despesas com alimentação",
  "4.1.03 - Despesas com transporte",
  "4.1.04 - Despesas com hospedagem",
  "4.1.05 - Despesas administrativas",
  "4.1.06 - Despesas com tecnologia",
  "4.1.07 - Despesas com comunicação",
  "4.1.99 - Outras despesas",
];

/** Conta contábil padrão para cada linha de despesa (preenchimento automático). */
export const EXPENSE_LINE_TO_ACCOUNT_CODE: Record<(typeof EXPENSE_LINES)[number], string> = {
  Viagem: "4.1.01 - Despesas com viagens",
  Alimentação: "4.1.02 - Despesas com alimentação",
  Transporte: "4.1.03 - Despesas com transporte",
  Hospedagem: "4.1.04 - Despesas com hospedagem",
  "Material de escritório": "4.1.05 - Despesas administrativas",
  "Software/Assinatura": "4.1.06 - Despesas com tecnologia",
  Comunicação: "4.1.07 - Despesas com comunicação",
  Outros: "4.1.99 - Outras despesas",
};

export function accountCodeForExpenseLine(line: string): string {
  return EXPENSE_LINE_TO_ACCOUNT_CODE[line as keyof typeof EXPENSE_LINE_TO_ACCOUNT_CODE] ?? "";
}
