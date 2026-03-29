import type { Reimbursement } from "@/types/reimbursement";
import { formatReimbursementDate } from "@/lib/formatLocalDate";
import { REIMBURSEMENT_STATUS_UI } from "@/lib/reimbursementStatusUi";
import { ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";

const LIMIT = 8;

interface Props {
  reimbursements: Reimbursement[];
  onSelect?: (r: Reimbursement) => void;
  className?: string;
}

export function AdminDashboardRecentList({
  reimbursements,
  onSelect,
  className,
}: Props) {
  const recent = reimbursements.slice(0, LIMIT);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-refined",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <History className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-sm font-medium text-foreground tracking-tight">
            Atividade recente
          </h2>
          <p className="text-xs text-muted-foreground font-light">
            Últimos reembolsos registrados
          </p>
        </div>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10 font-light">
          Nenhuma solicitação ainda.
        </p>
      ) : (
        <ul className="divide-y divide-border/70">
          {recent.map((r) => {
            const ui = REIMBURSEMENT_STATUS_UI[r.status];
            return (
              <li key={r.id}>
                <button
                  type="button"
                  disabled={!onSelect}
                  onClick={() => onSelect?.(r)}
                  className={cn(
                    "w-full flex items-center gap-3 py-3.5 text-left transition-colors rounded-lg -mx-1 px-1",
                    onSelect && "hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full ring-2 ring-offset-2 ring-offset-card",
                      ui.dotClass
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {r.requesterName}
                    </p>
                    <p className="text-xs text-muted-foreground font-light mt-0.5">
                      {formatReimbursementDate(r.createdAt)}
                      <span className="text-border mx-1.5">·</span>
                      <span className={ui.subtleClass}>{ui.label}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      R${" "}
                      {r.totalAmount.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    {onSelect && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
