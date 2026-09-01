export const BANK_DATA_PLACEHOLDER = "não informado";

export const BANK_ACCOUNT_TYPES = [
  { value: "corrente", label: "Conta corrente" },
  { value: "poupanca", label: "Poupança" },
] as const;

export type BankAccountType = (typeof BANK_ACCOUNT_TYPES)[number]["value"];

export function isBankDataPlaceholder(value: string | null | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === BANK_DATA_PLACEHOLDER;
}

export function bankAccountTypeLabel(value: string | null | undefined): string {
  const found = BANK_ACCOUNT_TYPES.find((t) => t.value === value);
  return found?.label ?? (value?.trim() || BANK_DATA_PLACEHOLDER);
}

export function formatBankDetailsLine(input: {
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankAccountType: string;
  bankAccountHolder: string;
  pixKey: string;
}): string {
  const missing =
    isBankDataPlaceholder(input.bankName) ||
    isBankDataPlaceholder(input.bankAgency) ||
    isBankDataPlaceholder(input.bankAccount) ||
    isBankDataPlaceholder(input.bankAccountType) ||
    isBankDataPlaceholder(input.bankAccountHolder) ||
    isBankDataPlaceholder(input.pixKey);
  const body = [
    `Banco: ${input.bankName.trim() || BANK_DATA_PLACEHOLDER}`,
    `Agência: ${input.bankAgency.trim() || BANK_DATA_PLACEHOLDER}`,
    `Conta: ${input.bankAccount.trim() || BANK_DATA_PLACEHOLDER} (${bankAccountTypeLabel(input.bankAccountType)})`,
    `Titular: ${input.bankAccountHolder.trim() || BANK_DATA_PLACEHOLDER}`,
    `PIX: ${input.pixKey.trim() || BANK_DATA_PLACEHOLDER}`,
  ].join(" | ");
  return missing ? `CONFIRMAR FORA DO SISTEMA — ${body}` : body;
}
