import type { ExpenseEmailKind } from "@/lib/expenseEmailTemplates";

/** Ação do financeiro: vira status na API e alinha aos templates de e-mail quando aplicável. */
export type AdminReimbursementDecision = "approve" | "reject" | "contest";

export function apiStatusForDecision(
  decision: AdminReimbursementDecision
): "aprovado" | "rejeitado" | "enviado" {
  if (decision === "approve") return "aprovado";
  if (decision === "reject") return "rejeitado";
  return "enviado";
}

/** Modelo de e-mail alinhado ao status atual do reembolso (para o botão “Notificar por e-mail”). */
export function expenseEmailKindForReimbursementStatus(status: string): ExpenseEmailKind {
  if (status === "aprovado") return "approve";
  if (status === "rejeitado") return "reject";
  return "contest";
}

export function toastMessageForDecision(decision: AdminReimbursementDecision): string {
  switch (decision) {
    case "approve":
      return "Reembolso aprovado com sucesso.";
    case "reject":
      return "Reembolso reprovado. O status foi atualizado.";
    case "contest":
      return "Solicitação marcada como pendente (contestação).";
  }
}
