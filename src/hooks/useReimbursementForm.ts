import { useState, useCallback } from "react";
import { Expense, ReimbursementFormData, accountCodeForExpenseLine } from "@/types/reimbursement";

const createEmptyExpense = (id: number): Expense => ({
  id,
  description: "",
  expenseLine: "",
  accountCode: "",
  amount: "",
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

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      expenses: [...prev.expenses, createEmptyExpense(prev.expenses.length + 1)],
    }));
  }, []);

  const removeExpense = useCallback((id: number) => {
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses
        .filter((e) => e.id !== id)
        .map((e, i) => ({ ...e, id: i + 1 })),
    }));
  }, []);

  const updateExpense = useCallback(
    (id: number, field: keyof Omit<Expense, "id" | "attachment">, value: string) => {
      setFormData((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`expense_${id}_${field}`];
        return next;
      });
    },
    []
  );

  const updateExpenseLine = useCallback((id: number, expenseLine: string) => {
    const accountCode = accountCodeForExpenseLine(expenseLine);
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

  const updateExpenseAttachment = useCallback((id: number, file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === id ? { ...e, attachment: file } : e)),
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

    formData.expenses.forEach((e) => {
      if (!e.description.trim()) newErrors[`expense_${e.id}_description`] = "Obrigatório";
      if (!e.expenseLine) newErrors[`expense_${e.id}_expenseLine`] = "Obrigatório";
      if (!e.amount || parseFloat(e.amount) <= 0) newErrors[`expense_${e.id}_amount`] = "Valor inválido";
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
  }, []);

  return {
    formData,
    errors,
    totalAmount,
    updateField,
    addExpense,
    removeExpense,
    updateExpense,
    updateExpenseLine,
    updateExpenseAttachment,
    validate,
    reset,
  };
}
