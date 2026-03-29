import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildMailtoHref,
  getExpenseEmailBody,
  getExpenseEmailSubject,
  type ExpenseEmailKind,
} from "@/lib/expenseEmailTemplates";
import { cn } from "@/lib/utils";
import { Copy, Mail, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  kind: ExpenseEmailKind;
  collaboratorName: string;
  collaboratorEmail: string;
  expenseDescription: string;
};

const kindLabels: Record<ExpenseEmailKind, string> = {
  approve: "Despesa aceita",
  reject: "Despesa reprovada",
  contest: "Despesa em contestação",
};

export function ExpenseEmailModal({
  open,
  onClose,
  kind,
  collaboratorName,
  collaboratorEmail,
  expenseDescription,
}: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!open) return;
    setSubject(getExpenseEmailSubject(kind));
    setBody(getExpenseEmailBody(kind, collaboratorName));
  }, [open, kind, collaboratorName]);

  if (!open) return null;

  const mailtoHref = buildMailtoHref(collaboratorEmail, subject, body);

  const copyAll = async () => {
    const text = `Para: ${collaboratorEmail}\nAssunto: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado para a área de transferência");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-email-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-refined-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 p-5 border-b border-border">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {kindLabels[kind]}
            </p>
            <h2 id="expense-email-title" className="text-lg font-medium text-foreground">
              E-mail para o colaborador
            </h2>
            <p className="text-sm text-muted-foreground truncate" title={collaboratorEmail}>
              {collaboratorEmail}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Despesa: <span className="text-foreground">{expenseDescription}</span>
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0 rounded-xl"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Assunto</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-body">Mensagem</Label>
            <textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className={cn(
                "flex min-h-[200px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
            {(kind === "reject" || kind === "contest") && (
              <p className="text-xs text-muted-foreground">
                Substitua o texto entre colchetes pelo motivo ou detalhe antes de enviar.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border p-5 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={copyAll}>
            <Copy className="h-4 w-4" />
            Copiar e-mail
          </Button>
          <Button type="button" className="rounded-xl gap-2" asChild>
            <a href={mailtoHref}>
              <Mail className="h-4 w-4" />
              Abrir no e-mail
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
