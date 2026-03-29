import type { AdminMetrics } from "@/types/admin";
import { PieChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  metrics: AdminMetrics;
  className?: string;
}

export function AdminDashboardStatusBreakdown({ metrics, className }: Props) {
  const max = Math.max(metrics.totalCount, 1);
  const rows = [
    {
      key: "pendente",
      label: "Pendente",
      sub: "Aguardando análise",
      count: metrics.pendingCount,
      barClass: "bg-amber-400",
      dotClass: "bg-amber-400",
    },
    {
      key: "aprovado",
      label: "Aprovado",
      sub: "Liberados / aceitos",
      count: metrics.approvedCount,
      barClass: "bg-emerald-500",
      dotClass: "bg-emerald-500",
    },
    {
      key: "rejeitado",
      label: "Rejeitado",
      sub: "Não aprovados",
      count: metrics.rejectedCount,
      barClass: "bg-red-500",
      dotClass: "bg-red-500",
    },
  ];

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-refined",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <PieChart className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-sm font-medium text-foreground tracking-tight">
            Status das solicitações
          </h2>
          <p className="text-xs text-muted-foreground font-light">
            Distribuição por situação
          </p>
        </div>
      </div>

      <ul className="space-y-5">
        {rows.map((row) => {
          const pct = Math.round((row.count / max) * 100);
          const widthPct = `${pct}%`;
          return (
            <li key={row.key} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn("h-2.5 w-2.5 shrink-0 rounded-full", row.dotClass)}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{row.label}</span>
                    <span className="text-muted-foreground font-light text-xs block sm:inline sm:ml-1">
                      {row.sub}
                    </span>
                  </div>
                </div>
                <span className="tabular-nums text-foreground font-semibold shrink-0">
                  {row.count}
                  <span className="text-muted-foreground font-normal text-xs ml-1">
                    ({metrics.totalCount ? pct : 0}%)
                  </span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted/80 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", row.barClass)}
                  style={{ width: widthPct }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {metrics.totalCount === 0 && (
        <p className="text-xs text-muted-foreground mt-4 font-light">
          Quando houver solicitações, os indicadores aparecerão aqui.
        </p>
      )}
    </section>
  );
}
