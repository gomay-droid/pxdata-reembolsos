import type { Expense } from "@/types/reimbursement";

export function isPlaceholderExpense(e: Expense): boolean {
  return (
    e.attachments.length === 0 &&
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

/** Valor base (R$) + IOF/imposto = total da linha. */
export function expenseLineTotal(e: Pick<Expense, "amount" | "amountUsd">): number {
  const base = parseExpenseAmount(e.amount);
  const tax = parseExpenseAmount(e.amountUsd ?? "");
  const safeBase = Number.isFinite(base) ? base : 0;
  const safeTax = Number.isFinite(tax) ? tax : 0;
  return safeBase + safeTax;
}

export function primaryAttachmentName(e: Expense): string {
  return e.attachments[0]?.name ?? "";
}

const VALIDATION_LABELS: Record<string, string> = {
  requesterName: "Nome do solicitante",
  requesterEmail: "E-mail do solicitante",
  requesterDocument: "CPF/CNPJ do solicitante",
  expenses_empty: "Pelo menos uma despesa",
};

const EXPENSE_FIELD_LABELS: Record<string, string> = {
  description: "título/item da despesa",
  expenseLine: "linha de despesa",
  amount: "valor em R$",
  supplierCnpj: "CNPJ do fornecedor",
  attachments: "comprovante anexado",
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

/** Valida uma despesa individual (ex.: antes de adicionar nova linha). */
export function validateExpenseItemFields(e: Expense): Record<string, string> {
  const newErrors: Record<string, string> = {};

  if (e.receiptProcessingStatus === "processing") {
    newErrors[`expense_${e.id}_processing`] = "Aguarde o processamento do comprovante.";
  }
  if (e.attachments.length === 0) {
    newErrors[`expense_${e.id}_attachments`] =
      "Anexe pelo menos um comprovante para salvar esta despesa.";
  }
  if (!e.description.trim()) {
    newErrors[`expense_${e.id}_description`] = "Informe o título/item da despesa.";
  }
  if (!e.expenseLine) {
    newErrors[`expense_${e.id}_expenseLine`] = "Selecione a linha de despesa.";
  }
  const amount = parseExpenseAmount(e.amount);
  if (!e.amount.trim() || !Number.isFinite(amount) || amount <= 0) {
    newErrors[`expense_${e.id}_amount`] = "Informe o valor em R$.";
  }

  return newErrors;
}
