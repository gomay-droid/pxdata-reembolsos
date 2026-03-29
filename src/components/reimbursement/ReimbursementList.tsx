import { Reimbursement } from "@/types/reimbursement";
import { formatReimbursementDate } from "@/lib/formatLocalDate";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle2, XCircle, Clock } from "lucide-react";

const statusConfig = {
  enviado: { label: "Enviado", icon: Clock, className: "bg-info/10 text-info border-info/20" },
  aprovado: {
    label: "Aprovado",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  rejeitado: {
    label: "Rejeitado",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

interface Props {
  reimbursements: Reimbursement[];
  onSelect?: (reimbursement: Reimbursement) => void;
}

export function ReimbursementList({ reimbursements, onSelect }: Props) {
  if (reimbursements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Nenhuma solicitação ainda. Envie um reembolso na aba Novo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {reimbursements.map((r) => {
        const status = statusConfig[r.status];
        const StatusIcon = status.icon;
        return (
          <div
            key={r.id}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            onClick={onSelect ? () => onSelect(r) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(r);
                  }
                : undefined
            }
            className={[
              "rounded-2xl border border-border bg-card p-5 flex flex-col md:flex-row md:items-center gap-4 transition-all duration-300 hover:shadow-refined",
              onSelect ? "cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background" : "",
            ].join(" ")}
          >
            <div className="h-10 w-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-accent-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-foreground">{r.id}</span>
                <Badge variant="outline" className={`text-xs rounded-full ${status.className}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {r.requesterName} · {r.expenseCount} {r.expenseCount === 1 ? "despesa" : "despesas"}
              </p>
            </div>

            <div className="text-right">
              <p className="text-lg font-medium text-foreground tracking-tight">
                R$ {r.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatReimbursementDate(r.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
