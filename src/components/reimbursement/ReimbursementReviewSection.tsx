import { Expense, EXPENSE_LINES, ACCOUNT_CODES } from "@/types/reimbursement";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ClipboardCheck, DollarSign } from "lucide-react";

interface Props {
  expenses: Expense[];
  errors: Record<string, string>;
  totalAmount: number;
  onUpdate: (id: number, field: keyof Omit<Expense, "id" | "attachment">, value: string) => void;
  onExpenseLineChange: (id: number, expenseLine: string) => void;
  onCnpjConfirmedChange: (id: number, checked: boolean) => void;
  reviewed: boolean;
  onReviewedChange: (checked: boolean) => void;
  className?: string;
  expensesContainerClassName?: string;
}

export function ReimbursementReviewSection({
  expenses,
  errors,
  totalAmount,
  onUpdate,
  onExpenseLineChange,
  onCnpjConfirmedChange,
  reviewed,
  onReviewedChange,
  className,
  expensesContainerClassName,
}: Props) {
  return (
    <div className={className ?? "rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5"}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ClipboardCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Revise suas despesas antes de enviar</h3>
          <p className="text-sm text-muted-foreground mt-1 font-light">
            Confira e ajuste os dados extraídos. Esta etapa é obrigatória antes do envio.
          </p>
        </div>
      </div>

      <div className={expensesContainerClassName ?? "space-y-4"}>
        {expenses.map((expense, idx) => (
          <div key={expense.id} className="rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Despesa {idx + 1}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Descrição</Label>
                <Input
                  value={expense.description}
                  onChange={(e) => onUpdate(expense.id, "description", e.target.value)}
                  className="h-11 bg-card border-border font-light"
                />
                {errors[`expense_${expense.id}_description`] && (
                  <p className="text-xs text-destructive">{errors[`expense_${expense.id}_description`]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Linha de despesa</Label>
                <Select
                  value={expense.expenseLine || undefined}
                  onValueChange={(v) => onExpenseLineChange(expense.id, v)}
                >
                  <SelectTrigger className="h-11 bg-card border-border font-light">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_LINES.map((line) => (
                      <SelectItem key={line} value={line}>
                        {line}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Conta contábil</Label>
                <Select
                  value={expense.accountCode || undefined}
                  onValueChange={(v) => onUpdate(expense.id, "accountCode", v)}
                >
                  <SelectTrigger className="h-11 bg-card border-border font-light">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_CODES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">CNPJ do fornecedor</Label>
                <Input
                  value={expense.supplierCnpj ?? ""}
                  onChange={(e) => onUpdate(expense.id, "supplierCnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="h-11 bg-card border-border font-light"
                />
                <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(expense.supplierCnpjConfirmed)}
                    onChange={(e) => onCnpjConfirmedChange(expense.id, e.target.checked)}
                  />
                  Confirmo que esta nota não possui CNPJ legível
                </label>
                {errors[`expense_${expense.id}_supplierCnpj`] && (
                  <p className="text-xs text-destructive">{errors[`expense_${expense.id}_supplierCnpj`]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Valor em R$</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expense.amount}
                  onChange={(e) => onUpdate(expense.id, "amount", e.target.value)}
                  className="h-11 bg-card border-border font-light"
                />
                {errors[`expense_${expense.id}_amount`] && (
                  <p className="text-xs text-destructive">{errors[`expense_${expense.id}_amount`]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Valor em $</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expense.amountUsd ?? ""}
                  onChange={(e) => onUpdate(expense.id, "amountUsd", e.target.value)}
                  className="h-11 bg-card border-border font-light"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <DollarSign className="h-4 w-4 text-primary" />
          Total do reembolso (R$)
        </div>
        <p className="text-2xl font-semibold text-primary tabular-nums">
          R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-background/60 p-4 space-y-2">
        <label className="inline-flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => onReviewedChange(e.target.checked)}
          />
          Revisei todas as despesas e confirmo os valores antes do envio.
        </label>
        {!reviewed && (
          <p className="text-xs text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Marque a revisão final para habilitar o envio.
          </p>
        )}
      </div>
    </div>
  );
}
