import { useState, useCallback, useRef, useMemo } from "react";
import {
  expenseLineTotal,
  isPlaceholderExpense,
  parseExpenseAmount,
  primaryAttachmentName,
  validateExpenseItemFields,
} from "@/lib/expenseAmount";
import {
  accountCodeForInferredLine,
  inferExpenseLineFromText,
} from "@/lib/inferExpenseLine";
import {
  Expense,
  ReimbursementFormData,
  getMergedAccountCodes,
  getMergedExpenseLines,
  isCatalogExpenseLine,
  resolveAccountCodeForLine,
  SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE,
  validateReceiptFile,
} from "@/types/reimbursement";

function collectDynamicLinesFromExpenses(expenses: Expense[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of expenses) {
    const line = e.expenseLine.trim();
    if (!line || isCatalogExpenseLine(line)) continue;
    map[line] = e.accountCode || SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE;
  }
  return map;
}

function applyExpenseLineToItem(
  expense: Expense,
  line: string,
  accountCode?: string
): { expense: Expense; dynamicLine?: { line: string; code: string } } {
  const code =
    accountCode?.trim() ||
    accountCodeForInferredLine(line) ||
    SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE;
  const next = { ...expense, expenseLine: line, accountCode: code };
  if (isCatalogExpenseLine(line)) return { expense: next };
  return { expense: next, dynamicLine: { line, code } };
}

function nextExpenseId(expenses: Expense[]): number {
  if (expenses.length === 0) return 1;
  return Math.max(...expenses.map((e) => e.id)) + 1;
}

function buildBulkAppend(
  prev: ReimbursementFormData,
  valid: File[]
): { next: ReimbursementFormData; newIds: number[] } {
  let base = [...prev.expenses];
  if (base.length === 1 && isPlaceholderExpense(base[0])) {
    base = [];
  }
  const startId = base.length === 0 ? 1 : nextExpenseId(base);
  const newExpenses: Expense[] = valid.map((file, i) => ({
    id: startId + i,
    description: "",
    expenseLine: "",
    accountCode: "",
    amount: "",
    amountUsd: "",
    supplierCnpj: "",
    supplierCnpjConfirmed: false,
    observation: "",
    attachments: [file],
    receiptProcessingStatus: "processing",
  }));
  return {
    next: { ...prev, expenses: [...base, ...newExpenses] },
    newIds: newExpenses.map((e) => e.id),
  };
}

const createEmptyExpense = (id: number): Expense => ({
  id,
  description: "",
  expenseLine: "",
  accountCode: "",
  amount: "",
  amountUsd: "",
  supplierCnpj: "",
  supplierCnpjConfirmed: false,
  observation: "",
  attachments: [],
});

export function useReimbursementForm() {
  const [formData, setFormData] = useState<ReimbursementFormData>({
    requesterName: "",
    requesterAddress: "",
    requesterDocument: "",
    requesterEmail: "",
    expenses: [createEmptyExpense(1)],
  });

  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dynamicExpenseLines, setDynamicExpenseLines] = useState<Record<string, string>>({});
  const dynamicExpenseLinesRef = useRef(dynamicExpenseLines);
  dynamicExpenseLinesRef.current = dynamicExpenseLines;

  const mergedDynamicLines = useMemo(
    () => ({ ...dynamicExpenseLines, ...collectDynamicLinesFromExpenses(formData.expenses) }),
    [dynamicExpenseLines, formData.expenses]
  );

  const expenseLineOptions = useMemo(
    () => getMergedExpenseLines(mergedDynamicLines),
    [mergedDynamicLines]
  );
  const accountCodeOptions = useMemo(
    () => getMergedAccountCodes(mergedDynamicLines),
    [mergedDynamicLines]
  );

  const setExpenseProcessingState = useCallback(
    (
      id: number,
      status: Expense["receiptProcessingStatus"],
      message?: string
    ) => {
      setFormData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) =>
          e.id === id
            ? {
                ...e,
                receiptProcessingStatus: status,
                receiptProcessingMessage: message,
              }
            : e
        ),
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`expense_${id}_processing`];
        return next;
      });
    },
    []
  );

  const updateField = useCallback(
    (field: keyof Omit<ReimbursementFormData, "expenses">, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    []
  );

  const addExpense = useCallback((): boolean => {
    const prev = formDataRef.current;
    const last = prev.expenses[prev.expenses.length - 1];
    if (last && !isPlaceholderExpense(last)) {
      const itemErrors = validateExpenseItemFields(last);
      if (Object.keys(itemErrors).length > 0) {
        setErrors((prevErr) => ({ ...prevErr, ...itemErrors }));
        return false;
      }
    }
    setFormData((p) => ({
      ...p,
      expenses: [...p.expenses, createEmptyExpense(nextExpenseId(p.expenses))],
    }));
    return true;
  }, []);

  const removeExpense = useCallback((id: number) => {
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`expense_${id}_`)) delete next[k];
      });
      return next;
    });
  }, []);

  const addExpensesFromFiles = useCallback(
    (
      files: File[]
    ): { added: number; errors: string[]; addedItems: Array<{ id: number; file: File }> } => {
      const list = Array.from(files);
      const errorsList: string[] = [];
      const valid: File[] = [];
      for (const f of list) {
        const err = validateReceiptFile(f);
        if (err) {
          errorsList.push(`${f.name}: ${err}`);
        } else {
          valid.push(f);
        }
      }

      if (valid.length === 0) {
        return { added: 0, errors: errorsList, addedItems: [] };
      }

      const prev = formDataRef.current;
      const { next, newIds } = buildBulkAppend(prev, valid);
      formDataRef.current = next;
      setFormData(next);

      const addedItems = newIds
        .map((id) => {
          const item = next.expenses.find((e) => e.id === id);
          const file = item?.attachments[0];
          if (!file) return null;
          return { id, file };
        })
        .filter((x): x is { id: number; file: File } => Boolean(x));

      return { added: valid.length, errors: errorsList, addedItems };
    },
    []
  );

  const updateExpense = useCallback(
    (id: number, field: keyof Omit<Expense, "id" | "attachments">, value: string) => {
      const dynamicBatch: Record<string, string> = {};

      setFormData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => {
          if (e.id !== id) return e;
          let next: Expense = { ...e, [field]: value };
          if (field === "supplierCnpj" && value.trim()) {
            next.supplierCnpjConfirmed = false;
          }
          if (field === "description" && value.trim() && !next.expenseLine.trim()) {
            const inferred = inferExpenseLineFromText(value, primaryAttachmentName(e));
            if (inferred) {
              const applied = applyExpenseLineToItem(next, inferred);
              next = applied.expense;
              if (applied.dynamicLine) {
                dynamicBatch[applied.dynamicLine.line] = applied.dynamicLine.code;
              }
            }
          }
          return next;
        }),
      }));

      if (Object.keys(dynamicBatch).length > 0) {
        setDynamicExpenseLines((prev) => ({ ...prev, ...dynamicBatch }));
      }

      setErrors((prev) => {
        const next = { ...prev };
        delete next[`expense_${id}_${field}`];
        if (field === "description") {
          delete next[`expense_${id}_expenseLine`];
          delete next[`expense_${id}_accountCode`];
        }
        return next;
      });
    },
    []
  );

  const applyExpenseExtractionResult = useCallback(
    (
      id: number,
      data: {
        description?: string | null;
        expenseLine?: string | null;
        accountCode?: string | null;
        amountBRL?: number | null;
        amountUSD?: number | null;
        supplierCnpj?: string | null;
      }
    ) => {
      const dynamicBatch: Record<string, string> = {};

      setFormData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => {
          if (e.id !== id) return e;
          let next: Expense = { ...e };

          if (!next.description.trim() && data.description?.trim()) {
            next.description = data.description.trim();
          }

          const haystack = [
            data.expenseLine,
            next.description,
            data.description,
          ]
            .filter((part) => typeof part === "string" && part.trim())
            .join("\n");

          const attachmentHint = primaryAttachmentName(e);

          if (!next.expenseLine.trim()) {
            let line =
              data.expenseLine?.trim() ||
              inferExpenseLineFromText(haystack, attachmentHint) ||
              "";

            if (!line && next.description.trim()) {
              line = inferExpenseLineFromText(next.description, attachmentHint) || "";
            }

            if (line) {
              const applied = applyExpenseLineToItem(
                next,
                line,
                data.accountCode?.trim() ||
                  resolveAccountCodeForLine(line, dynamicExpenseLinesRef.current)
              );
              next = applied.expense;
              if (applied.dynamicLine) {
                dynamicBatch[applied.dynamicLine.line] = applied.dynamicLine.code;
              }
            } else if (data.accountCode?.trim() && !next.accountCode.trim()) {
              next.accountCode = data.accountCode.trim();
            }
          }

          if (!next.amount.trim() && typeof data.amountBRL === "number" && data.amountBRL > 0) {
            next.amount = data.amountBRL.toFixed(2);
          }
          if (
            !(next.amountUsd ?? "").trim() &&
            typeof data.amountUSD === "number" &&
            data.amountUSD > 0
          ) {
            next.amountUsd = data.amountUSD.toFixed(2);
          }
          if (!next.supplierCnpj?.trim() && data.supplierCnpj?.trim()) {
            next.supplierCnpj = data.supplierCnpj.trim();
            next.supplierCnpjConfirmed = false;
          }
          next.receiptProcessingStatus = "extracted";
          next.receiptProcessingMessage = undefined;
          return next;
        }),
      }));

      if (Object.keys(dynamicBatch).length > 0) {
        setDynamicExpenseLines((prev) => ({ ...prev, ...dynamicBatch }));
      }
    },
    []
  );

  const updateExpenseLine = useCallback((id: number, expenseLine: string) => {
    const accountCode =
      resolveAccountCodeForLine(expenseLine, dynamicExpenseLinesRef.current) ||
      SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE;
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id ? { ...e, expenseLine, accountCode } : e
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`expense_${id}_expenseLine`];
      delete next[`expense_${id}_accountCode`];
      return next;
    });
  }, []);

  const setExpenseCnpjConfirmed = useCallback((id: number, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) =>
        e.id === id ? { ...e, supplierCnpjConfirmed: checked } : e
      ),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`expense_${id}_supplierCnpj`];
      return next;
    });
  }, []);

  const addExpenseAttachments = useCallback((id: number, files: File[]) => {
    if (files.length === 0) return;
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          attachments: [...e.attachments, ...files],
        };
      }),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`expense_${id}_attachments`];
      return next;
    });
  }, []);

  const removeExpenseAttachment = useCallback((id: number, index: number) => {
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => {
        if (e.id !== id) return e;
        const attachments = e.attachments.filter((_, i) => i !== index);
        return {
          ...e,
          attachments,
          receiptProcessingStatus:
            attachments.length === 0 ? undefined : e.receiptProcessingStatus,
          receiptProcessingMessage:
            attachments.length === 0 ? undefined : e.receiptProcessingMessage,
        };
      }),
    }));
  }, []);

  const validate = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.requesterName.trim()) newErrors.requesterName = "Nome é obrigatório";
    if (!formData.requesterEmail.trim()) newErrors.requesterEmail = "Email é obrigatório";
    if (!formData.requesterDocument.trim()) newErrors.requesterDocument = "CPF/CNPJ é obrigatório";

    const activeExpenses = formData.expenses.filter((e) => !isPlaceholderExpense(e));

    if (activeExpenses.length === 0) {
      newErrors.expenses_empty = "Adicione pelo menos uma despesa ou envie comprovantes.";
    }

    activeExpenses.forEach((e) => {
      const itemErrors = validateExpenseItemFields(e);
      Object.assign(newErrors, itemErrors);
      if (e.receiptProcessingStatus === "error") {
        newErrors[`expense_${e.id}_processing`] =
          e.receiptProcessingMessage ?? "Corrija ou remova este comprovante.";
      }
      if (!e.supplierCnpj?.trim() && !e.supplierCnpjConfirmed) {
        newErrors[`expense_${e.id}_supplierCnpj`] = "Preencha o CNPJ ou confirme a ausência.";
      }
    });

    setErrors(newErrors);
    return newErrors;
  }, [formData]);

  const totalAmount = formData.expenses.reduce(
    (sum, e) => sum + expenseLineTotal(e),
    0
  );

  const reset = useCallback(() => {
    setFormData({
      requesterName: "",
      requesterAddress: "",
      requesterDocument: "",
      requesterEmail: "",
      expenses: [createEmptyExpense(1)],
    });
    setErrors({});
    setDynamicExpenseLines({});
  }, []);

  return {
    formData,
    errors,
    totalAmount,
    expenseLineOptions,
    accountCodeOptions,
    updateField,
    addExpense,
    removeExpense,
    addExpensesFromFiles,
    setExpenseProcessingState,
    applyExpenseExtractionResult,
    updateExpense,
    updateExpenseLine,
    addExpenseAttachments,
    removeExpenseAttachment,
    setExpenseCnpjConfirmed,
    validate,
    reset,
  };
}
