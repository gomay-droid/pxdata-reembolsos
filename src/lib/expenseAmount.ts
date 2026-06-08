import type { Expense } from "@/types/reimbursement";

export function isPlaceholderExpense(e: Expense): boolean {
  return (
    !e.attachment &&
    !e.description.trim() &&
    !e.expenseLine &&
    !e.amount.trim() &&
    !e.receiptProcessingStatus
  );
}

/** Converte valor digitado (ex.: 20,00 ou 1.234,56) para número. */
export function parseExpenseAmount(raw: string): number {
  const s = raw.trim();
  if (!s) return NaN;
  if (s.includes(",")) {
    return parseFloat(s.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(s);
}

const VALIDATION_LABELS: Record<string, string> = {
  requesterName: "Nome do solicitante",
  requesterEmail: "E-mail do solicitante",
  requesterDocument: "CPF/CNPJ do solicitante",
  expenses_empty: "Pelo menos uma despesa",
};

const EXPENSE_FIELD_LABELS: Record<string, string> = {
  description: "descrição",
  expenseLine: "linha de despesa",
  amount: "valor em R$",
  supplierCnpj: "CNPJ do fornecedor",
  attachment: "comprovante anexado",
  processing: "processamento do comprovante",
};

export function validationErrorLabel(key: string): string {
  if (VALIDATION_LABELS[key]) return VALIDATION_LABELS[key];
  const match = key.match(/^expense_\d+_(.+)$/);
  if (match) {
    const field = EXPENSE_FIELD_LABELS[match[1]] ?? match[1];
    return `Despesa — ${field}`;
  }
  return key;
}

export function formatValidationToast(errors: Record<string, string>): string {
  const keys = Object.keys(errors);
  if (keys.length === 0) return "Preencha todos os campos obrigatórios";
  const labels = keys.slice(0, 3).map(validationErrorLabel);
  const suffix = keys.length > 3 ? ` (+${keys.length - 3})` : "";
  return `Pendente: ${labels.join(", ")}${suffix}`;
}
