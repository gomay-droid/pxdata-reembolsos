import { useEffect, useState } from "react";
import { useReimbursementForm } from "@/hooks/useReimbursementForm";
import { inferDisplayNameFromEmail } from "@/lib/inferNameFromEmail";
import { RequesterSection } from "@/components/reimbursement/RequesterSection";
import { ClientDataSection } from "@/components/reimbursement/ClientDataSection";
import { ExpensesSection } from "@/components/reimbursement/ExpensesSection";
import { ReimbursementReviewSection } from "@/components/reimbursement/ReimbursementReviewSection";
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
  } = useReimbursementForm();

  const [submitting, setSubmitting] = useState(false);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

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

  const handleConfirmSend = async () => {
    if (!reviewConfirmed) {
      toast.error("Confirme a revisão final antes de enviar.");
      return;
    }
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
      setReviewModalOpen(false);
      reset();
      setReviewConfirmed(false);
      await onSubmitted?.();
    } catch {
      toast.error("Erro de rede. Verifique se o servidor está em execução.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReviewModal = () => {
    if (formData.expenses.length === 0) {
      toast.error("Adicione pelo menos uma despesa antes de enviar.");
      return;
    }
    setReviewModalOpen(true);
  };

  return (
    <form className="space-y-8">
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
          expenseLineOptions={expenseLineOptions}
          accountCodeOptions={accountCodeOptions}
          onAdd={addExpense}
          onRemove={removeExpense}
          addExpensesFromFiles={addExpensesFromFiles}
          setExpenseProcessingState={setExpenseProcessingState}
          applyExpenseExtractionResult={applyExpenseExtractionResult}
          onUpdate={updateExpense}
          onExpenseLineChange={updateExpenseLine}
          onAttachmentChange={updateExpenseAttachment}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="lg"
          disabled={submitting}
          onClick={handleOpenReviewModal}
          className="gap-2 px-8 h-12 text-base font-medium"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Enviando…" : "Enviar Solicitação"}
        </Button>
      </div>

      {reviewModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Revisão final das despesas"
          onClick={() => {
            if (submitting) return;
            setReviewModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] bg-background rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 md:px-6 py-4 border-b border-border bg-primary/5">
              <h3 className="text-lg font-medium text-foreground">Revisão final do reembolso</h3>
              <p className="text-sm text-muted-foreground font-light mt-0.5">
                Revise os dados antes de confirmar o envio.
              </p>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <ReimbursementReviewSection
                expenses={formData.expenses}
                errors={errors}
                totalAmount={totalAmount}
                expenseLineOptions={expenseLineOptions}
                accountCodeOptions={accountCodeOptions}
                onUpdate={updateExpense}
                onExpenseLineChange={updateExpenseLine}
                onCnpjConfirmedChange={setExpenseCnpjConfirmed}
                reviewed={reviewConfirmed}
                onReviewedChange={setReviewConfirmed}
                className="space-y-5"
                expensesContainerClassName="space-y-4 max-h-[42vh] overflow-y-auto pr-1"
              />
            </div>

            <div className="px-5 md:px-6 pt-4 pb-6 md:pb-5 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              <div className="mt-1 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setReviewModalOpen(false)}
                  disabled={submitting}
                >
                  Voltar e editar
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleConfirmSend()}
                  disabled={submitting || !reviewConfirmed}
                  className="gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {submitting ? "Enviando…" : "Confirmar e enviar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
