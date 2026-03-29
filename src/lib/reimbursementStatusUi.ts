import type { Reimbursement } from "@/types/reimbursement";

export type ReimbursementStatus = Reimbursement["status"];

/** Rótulos e cores alinhados à UX pedida (pendente / aprovado / rejeitado). */
export const REIMBURSEMENT_STATUS_UI: Record<
  ReimbursementStatus,
  { label: string; dotClass: string; barClass: string; subtleClass: string }
> = {
  enviado: {
    label: "Pendente",
    dotClass: "bg-amber-400 ring-amber-400/30",
    barClass: "bg-amber-400",
    subtleClass: "text-amber-800 dark:text-amber-200/90",
  },
  aprovado: {
    label: "Aprovado",
    dotClass: "bg-emerald-500 ring-emerald-500/30",
    barClass: "bg-emerald-500",
    subtleClass: "text-emerald-800 dark:text-emerald-300/90",
  },
  rejeitado: {
    label: "Rejeitado",
    dotClass: "bg-red-500 ring-red-500/30",
    barClass: "bg-red-500",
    subtleClass: "text-red-800 dark:text-red-300/90",
  },
};
