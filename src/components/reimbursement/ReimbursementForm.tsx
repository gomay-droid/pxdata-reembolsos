import { useEffect, useState } from "react";
import { useReimbursementForm } from "@/hooks/useReimbursementForm";
import { inferDisplayNameFromEmail } from "@/lib/inferNameFromEmail";
import { RequesterSection } from "@/components/reimbursement/RequesterSection";
import { ClientDataSection } from "@/components/reimbursement/ClientDataSection";
import { ExpensesSection } from "@/components/reimbursement/ExpensesSection";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";
import type { CompanyProfile } from "@/types/company";
import { Send, Loader2 } from "lucide-react";

export interface AuthProfileForForm {
  email: string;
  name?: string;
}

interface Props {
  onSubmitted?: () => void | Promise<void>;
  /** Dados do login Google — preenche nome e e-mail quando os campos ainda estão vazios. */
  authProfile?: AuthProfileForForm | null;
  /** Dados da empresa (API /api/company). */
  companyProfile?: CompanyProfile | null;
  companyLoading?: boolean;
}

export default function ReimbursementForm({
  onSubmitted,
  authProfile,
  companyProfile,
  companyLoading,
}: Props) {
  const {
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
  } = useReimbursementForm();

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authProfile?.email) return;

    if (!formData.requesterEmail.trim()) {
      updateField("requesterEmail", authProfile.email);
    }

    if (!formData.requesterName.trim()) {
      const fromGoogle = authProfile.name?.trim();
      const fromEmail = inferDisplayNameFromEmail(authProfile.email);
      const name = fromGoogle || fromEmail;
      if (name) updateField("requesterName", name);
    }
  }, [
    authProfile?.email,
    authProfile?.name,
    formData.requesterEmail,
    formData.requesterName,
    updateField,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const payload = {
      requesterName: formData.requesterName,
      requesterAddress: formData.requesterAddress,
      requesterDocument: formData.requesterDocument,
      requesterEmail: formData.requesterEmail,
      expenses: formData.expenses.map(({ description, expenseLine, accountCode, amount }) => ({
        description,
        expenseLine,
        accountCode,
        amount,
      })),
    };

    const fd = new FormData();
    fd.append("payload", JSON.stringify(payload));
    formData.expenses.forEach((e) => {
      if (e.attachment) fd.append("files", e.attachment);
    });

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/reimbursements"), {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      let data: { error?: string; id?: string } = {};
      let text: string | null = null;
      try {
        data = (await res.json()) as { error?: string; id?: string };
      } catch {
        text = await res.text().catch(() => null);
      }

      if (!res.ok) {
        toast.error(
          data.error ??
            text ??
            `Não foi possível enviar o reembolso (HTTP ${res.status}).`
        );
        return;
      }

      toast.success("Reembolso enviado com sucesso!", {
        description: `${formData.expenses.length} despesa(s) totalizando R$ ${totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} · ${data.id ?? ""}`,
      });
      reset();
      await onSubmitted?.();
    } catch {
      toast.error("Erro de rede. Verifique se o servidor está em execução.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="rounded-2xl bg-primary p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-medium text-primary-foreground tracking-tight">
          Solicitação de Reembolso
        </h1>
        <p className="text-sm text-primary-foreground/70 mt-1 font-light">
          Preencha os dados abaixo para registrar sua solicitação
        </p>
      </div>

      <ClientDataSection company={companyProfile ?? null} loading={companyLoading} />

      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <RequesterSection
          name={formData.requesterName}
          address={formData.requesterAddress}
          document={formData.requesterDocument}
          email={formData.requesterEmail}
          errors={errors}
          onUpdate={updateField}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <ExpensesSection
          expenses={formData.expenses}
          errors={errors}
          totalAmount={totalAmount}
          onAdd={addExpense}
          onRemove={removeExpense}
          onUpdate={updateExpense}
          onExpenseLineChange={updateExpenseLine}
          onAttachmentChange={updateExpenseAttachment}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="rounded-xl gap-2 px-8 h-12 text-base font-medium"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Enviando…" : "Enviar Solicitação"}
        </Button>
      </div>
    </form>
  );
}
