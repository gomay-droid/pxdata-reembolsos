import type { AdminMetrics } from "@/types/admin";
import { Banknote, CheckCircle2, ClipboardList, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

function money(n: number) {
  return `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface Props {
  metrics: AdminMetrics;
  className?: string;
}

export function AdminDashboardSummaryCards({ metrics, className }: Props) {
  const items = [
    {
      title: "Solicitações enviadas",
      value: String(metrics.totalCount),
      hint: "Total no sistema",
      icon: ClipboardList,
      accent: "from-primary/12 to-primary/5",
      iconBg: "bg-primary/15 text-primary",
    },
    {
      title: "Valor total solicitado",
      value: money(metrics.totalAmount),
      hint: "Soma de todas as solicitações",
      icon: Banknote,
      accent: "from-violet-500/10 to-transparent",
      iconBg: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    },
    {
      title: "Pendentes de análise",
      value: String(metrics.pendingCount),
      hint: "Aguardando o financeiro",
      icon: Hourglass,
      accent: "from-amber-500/10 to-transparent",
      iconBg: "bg-amber-500/12 text-amber-800 dark:text-amber-200",
    },
    {
      title: "Aprovados",
      value: String(metrics.approvedCount),
      hint: "Solicitações aprovadas",
      icon: CheckCircle2,
      accent: "from-emerald-500/10 to-transparent",
      iconBg: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300",
    },
  ] as const;

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 shadow-refined",
              "bg-gradient-to-br to-card",
              item.accent
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.title}
                </p>
                <p className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground font-light">{item.hint}</p>
              </div>
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  item.iconBg
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
