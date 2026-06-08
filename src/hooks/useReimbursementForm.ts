import { useState, useCallback, useRef, useMemo } from "react";
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

function nextExpenseId(expenses: Expense[]): number {
  if (expenses.length === 0) return 1;
  return Math.max(...expenses.map((e) => e.id)) + 1;
}

function isPlaceholderExpense(e: Expense): boolean {
  return (
    !e.attachment &&
    !e.description.trim() &&
    !e.expenseLine &&
    !e.amount.trim() &&
    !e.receiptProcessingStatus
  );
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
    attachment: file,
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
  attachment: null,
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
  /** Linhas criadas automaticamente ao detectar assinatura de software (ex.: LICENCIAMENTO CLAUDE). */
  const [dynamicExpenseLines, setDynamicExpenseLines] = useState<Record<string, string>>({});
  const dynamicExpenseLinesRef = useRef(dynamicExpenseLines);
  dynamicExpenseLinesRef.current = dynamicExpenseLines;

  const expenseLineOptions = useMemo(
    () => getMergedExpenseLines(dynamicExpenseLines),
    [dynamicExpenseLines]
  );
  const accountCodeOptions = useMemo(
    () => getMergedAccountCodes(dynamicExpenseLines),
    [dynamicExpenseLines]
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

  const addExpense = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      expenses: [...prev.expenses, createEmptyExpense(nextExpenseId(prev.expenses))],
    }));
  }, []);

  const removeExpense = useCallback(
    (id: number) => {
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
    },
    []
  );

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
          if (!item?.attachment) return null;
          return { id, file: item.attachment };
        })
        .filter((x): x is { id: number; file: File } => Boolean(x));

      return { added: valid.length, errors: errorsList, addedItems };
    },
    []
  );

  const updateExpense = useCallback(
    (id: number, field: keyof Omit<Expense, "id" | "attachment">, value: string) => {
      setFormData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => {
          if (e.id !== id) return e;
          const next: Expense = { ...e, [field]: value };
          if (field === "supplierCnpj" && value.trim()) {
            next.supplierCnpjConfirmed = false;
          }
          return next;
        }),
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`expense_${id}_${field}`];
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
      setFormData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => {
          if (e.id !== id) return e;
          const next: Expense = { ...e };
          if (data.description?.trim() && !next.description.trim()) {
            next.description = data.description.trim();
          }
          if (data.expenseLine?.trim()) {
            const line = data.expenseLine.trim();
            const code =
              data.accountCode?.trim() ||
              resolveAccountCodeForLine(line, dynamicExpenseLinesRef.current) ||
              SOFTWARE_SUBSCRIPTION_ACCOUNT_CODE;
            next.expenseLine = line;
            next.accountCode = code;
            if (!isCatalogExpenseLine(line)) {
              setDynamicExpenseLines((prev) => ({ ...prev, [line]: code }));
            }
          } else if (data.accountCode?.trim()) {
            next.accountCode = data.accountCode.trim();
          }
          if (typeof data.amountBRL === "number" && data.amountBRL > 0) {
            next.amount = data.amountBRL.toFixed(2);
          }
          if (typeof data.amountUSD === "number" && data.amountUSD > 0) {
            next.amountUsd = data.amountUSD.toFixed(2);
          }
          if (data.supplierCnpj?.trim()) {
            next.supplierCnpj = data.supplierCnpj.trim();
            next.supplierCnpjConfirmed = false;
          }
          next.receiptProcessingStatus = "extracted";
          next.receiptProcessingMessage = undefined;
          return next;
        }),
      }));
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

  const updateExpenseAttachment = useCallback((id: number, file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => {
        if (e.id !== id) return e;
        if (!file) {
          return {
            ...e,
            attachment: null,
            amountUsd: e.amountUsd ?? "",
            supplierCnpj: e.supplierCnpj ?? "",
            receiptProcessingStatus: undefined,
            receiptProcessingMessage: undefined,
          };
        }
        return {
          ...e,
          attachment: file,
          receiptProcessingStatus: undefined,
          receiptProcessingMessage: undefined,
        };
      }),
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`expense_${id}_attachment`];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.requesterName.trim()) newErrors.requesterName = "Nome é obrigatório";
    if (!formData.requesterEmail.trim()) newErrors.requesterEmail = "Email é obrigatório";
    if (!formData.requesterDocument.trim()) newErrors.requesterDocument = "CPF/CNPJ é obrigatório";

    if (formData.expenses.length === 0) {
      newErrors.expenses_empty = "Adicione pelo menos uma despesa ou envie comprovantes.";
    }

    formData.expenses.forEach((e) => {
      if (e.receiptProcessingStatus === "processing") {
        newErrors[`expense_${e.id}_processing`] = "Aguarde o processamento deste comprovante.";
      }
      if (e.receiptProcessingStatus === "error") {
        newErrors[`expense_${e.id}_processing`] =
          e.receiptProcessingMessage ?? "Corrija ou remova este comprovante.";
      }
      if (!e.description.trim()) newErrors[`expense_${e.id}_description`] = "Obrigatório";
      if (!e.expenseLine) newErrors[`expense_${e.id}_expenseLine`] = "Obrigatório";
      if (!e.amount || parseFloat(e.amount) <= 0) newErrors[`expense_${e.id}_amount`] = "Valor inválido";
      if (!e.supplierCnpj?.trim() && !e.supplierCnpjConfirmed) {
        newErrors[`expense_${e.id}_supplierCnpj`] = "Preencha o CNPJ ou confirme a ausência.";
      }
      if (!e.attachment) newErrors[`expense_${e.id}_attachment`] = "Anexe o comprovante desta despesa";
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const totalAmount = formData.expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

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
    updateExpenseAttachment,
    setExpenseCnpjConfirmed,
    validate,
    reset,
  };
}
