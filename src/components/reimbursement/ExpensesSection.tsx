import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Expense, EXPENSE_LINES, ACCOUNT_CODES, RECEIPT_ACCEPT_ATTR } from "@/types/reimbursement";
import { DescriptionCombobox } from "@/components/reimbursement/DescriptionCombobox";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Image,
  Plus,
  Receipt,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ReceiptBulkUpload, toastBulkUploadSummary } from "@/components/reimbursement/ReceiptBulkUpload";
import { cn } from "@/lib/utils";

interface Props {
  expenses: Expense[];
  errors: Record<string, string>;
  totalAmount: number;
  onAdd: () => void;
  onRemove: (id: number) => void;
  onUpdate: (id: number, field: keyof Omit<Expense, "id" | "attachment">, value: string) => void;
  onExpenseLineChange: (id: number, expenseLine: string) => void;
  onAttachmentChange: (id: number, file: File | null) => void;
  /** Um arquivo = uma despesa. */
  addExpensesFromFiles: (files: File[]) => { added: number; errors: string[] };
}

export function ExpensesSection({
  expenses,
  errors,
  totalAmount,
  onAdd,
  onRemove,
  onUpdate,
  onExpenseLineChange,
  onAttachmentChange,
  addExpensesFromFiles,
}: Props) {
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});

  const isOpen = (id: number) => openItems[id] !== false;

  const toggleItem = (id: number) => {
    setOpenItems((prev) => ({ ...prev, [id]: !isOpen(id) }));
  };

  const lineTotal = (e: Expense) => {
    const n = parseFloat(e.amount);
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-refined space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-medium text-foreground">Comprovantes</h3>
            <p className="text-sm text-muted-foreground mt-0.5 font-light">
              Envie primeiro os arquivos: cada um gera uma despesa. Você ainda pode adicionar linhas
              manualmente ou trocar o anexo em cada item.
            </p>
          </div>
        </div>
        <ReceiptBulkUpload
          onFiles={(files) => {
            const result = addExpensesFromFiles(files);
            toastBulkUploadSummary(result.added, result.errors);
          }}
        />
      </div>

      {errors.expenses_empty && (
        <p className="text-sm text-destructive px-1">{errors.expenses_empty}</p>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-refined">
        <div className="px-5 md:px-6 py-4 md:py-5 border-b border-border bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-medium text-foreground">Despesas desta solicitação</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Uma solicitação · {expenses.length}{" "}
                  {expenses.length === 1 ? "despesa" : "despesas"} · cada item tem seu comprovante · o
                  total aparece no rodapé
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAdd}
                className="gap-2 border-border text-foreground hover:bg-accent h-10"
              >
                <Plus className="h-4 w-4" />
                Adicionar despesa
              </Button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {expenses.length === 0 && (
            <div className="px-5 md:px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Nenhuma despesa ainda. Envie comprovantes na área acima ou use «Adicionar despesa» para
                incluir uma linha manualmente.
              </p>
            </div>
          )}
          {expenses.map((expense, index) => {
            const expanded = isOpen(expense.id);
            return (
              <div key={expense.id} className="bg-card">
                <button
                  type="button"
                  onClick={() => toggleItem(expense.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 md:px-6 py-3 text-left hover:bg-muted/20 transition-colors"
                  aria-expanded={expanded}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground truncate">
                      Item {index + 1}
                      {expense.attachment
                        ? ` · ${expense.attachment.name}`
                        : expense.description?.trim()
                          ? ` · ${expense.description.trim()}`
                          : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-end">
                    <span className="text-sm tabular-nums text-foreground">
                      R${" "}
                      {lineTotal(expense).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title="Remover item"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(expense.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </button>

                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 md:px-6 pb-5 pt-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DescriptionCombobox
                          inputId={`expense-desc-${expense.id}`}
                          value={expense.description}
                          onChange={(v) => onUpdate(expense.id, "description", v)}
                          error={errors[`expense_${expense.id}_description`]}
                        />

                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Linha de despesa *</Label>
                          <Select
                            value={expense.expenseLine || undefined}
                            onValueChange={(v) => onExpenseLineChange(expense.id, v)}
                          >
                            <SelectTrigger className="bg-secondary border-border font-light">
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
                          {errors[`expense_${expense.id}_expenseLine`] && (
                            <p className="text-xs text-destructive">
                              {errors[`expense_${expense.id}_expenseLine`]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Conta contábil</Label>
                          <Select
                            value={expense.accountCode || undefined}
                            onValueChange={(v) => onUpdate(expense.id, "accountCode", v)}
                          >
                            <SelectTrigger className="bg-secondary border-border font-light">
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
                          <Label className="text-sm text-muted-foreground">Valor (R$) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={expense.amount}
                            onChange={(e) => onUpdate(expense.id, "amount", e.target.value)}
                            placeholder="0,00"
                            className="bg-secondary border-border font-light"
                          />
                          {errors[`expense_${expense.id}_amount`] && (
                            <p className="text-xs text-destructive">
                              {errors[`expense_${expense.id}_amount`]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Valor em $ (opcional)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={expense.amountUsd ?? ""}
                            onChange={(e) => onUpdate(expense.id, "amountUsd", e.target.value)}
                            placeholder="0.00"
                            className="bg-secondary border-border font-light"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm text-muted-foreground">CNPJ do fornecedor</Label>
                          <Input
                            value={expense.supplierCnpj ?? ""}
                            onChange={(e) => onUpdate(expense.id, "supplierCnpj", e.target.value)}
                            placeholder="00.000.000/0000-00"
                            className="bg-secondary border-border font-light"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-sm text-muted-foreground">Comprovante desta despesa *</Label>
                          <p className="text-xs text-muted-foreground">
                            Anexe PDF, JPG ou PNG (até 15 MB). Preencha descrição, linha de despesa, valor e
                            CNPJ manualmente.
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label
                              htmlFor={`attachment-${expense.id}`}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/50 px-4 py-3 text-sm text-foreground cursor-pointer hover:border-foreground/25 transition-colors duration-300"
                            >
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              {expense.attachment ? "Trocar arquivo" : "Escolher arquivo"}
                            </label>
                            <input
                              id={`attachment-${expense.id}`}
                              type="file"
                              accept={RECEIPT_ACCEPT_ATTR}
                              className="sr-only"
                              onChange={(e) => {
                                const f = e.target.files?.[0] ?? null;
                                e.target.value = "";
                                onAttachmentChange(expense.id, f);
                              }}
                            />
                            {expense.attachment && (
                              <div className="flex items-center gap-2 min-w-0 flex-1 rounded-2xl border border-border bg-card px-3 py-2">
                                {expense.attachment.type.includes("pdf") ? (
                                  <FileText className="h-4 w-4 text-destructive/70 shrink-0" />
                                ) : (
                                  <Image className="h-4 w-4 text-info shrink-0" />
                                )}
                                <span className="text-sm truncate">{expense.attachment.name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 ml-auto shrink-0"
                                  onClick={() => onAttachmentChange(expense.id, null)}
                                  aria-label="Remover arquivo"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {errors[`expense_${expense.id}_attachment`] && (
                            <p className="text-xs text-destructive">
                              {errors[`expense_${expense.id}_attachment`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 md:px-6 py-4 border-t border-border bg-primary/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Total do reembolso (soma das despesas)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Atualiza automaticamente ao incluir, remover ou alterar valores
              </p>
            </div>
            <p className="text-2xl md:text-3xl font-semibold text-primary tracking-tight tabular-nums">
              R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
