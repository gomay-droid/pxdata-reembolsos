import type { Reimbursement } from "@/types/reimbursement";

export const REIMBURSEMENT_STATUS_VALUES = [
  "enviado",
  "aprovado",
  "rejeitado",
  "contestado",
] as const;

export type ReimbursementStatus = (typeof REIMBURSEMENT_STATUS_VALUES)[number];

export const REIMBURSEMENT_STATUS_FILTER_OPTIONS: Array<{
  value: "all" | ReimbursementStatus;
  label: string;
}> = [
  { value: "all", label: "Todos os status" },
  { value: "enviado", label: "Enviado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
  { value: "contestado", label: "Contestado" },
];

export function isReimbursementStatus(value: string): value is ReimbursementStatus {
  return (REIMBURSEMENT_STATUS_VALUES as readonly string[]).includes(value);
}

export function parseStatusQuery(raw: unknown): ReimbursementStatus | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  return isReimbursementStatus(trimmed) ? trimmed : undefined;
}
