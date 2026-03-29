import { useMemo } from "react";
import type { Reimbursement } from "@/types/reimbursement";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

function monthlyTotals(
  reimbursements: Reimbursement[]
): { key: string; label: string; total: number }[] {
  const map = new Map<string, number>();
  for (const r of reimbursements) {
    const d = new Date(r.createdAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) ?? 0) + (r.totalAmount ?? 0));
  }
  const keys = [...map.keys()].sort();
  let lastKeys = keys.slice(-6);
  if (lastKeys.length === 0) {
    const now = new Date();
    lastKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      lastKeys.push(key);
    }
  }
  return lastKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    return { key, label, total: map.get(key) ?? 0 };
  });
}

interface Props {
  reimbursements: Reimbursement[];
  className?: string;
}

export function AdminDashboardVolumeChart({ reimbursements, className }: Props) {
  const series = useMemo(() => monthlyTotals(reimbursements), [reimbursements]);
  const maxVal = Math.max(...series.map((s) => s.total), 1);

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-refined",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-sm font-medium text-foreground tracking-tight">
            Evolução dos valores
          </h2>
          <p className="text-xs text-muted-foreground font-light">
            Volume solicitado por mês (últimos períodos)
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 h-[140px] px-1">
        {series.map((s) => {
          const barPx = Math.max(6, Math.round((s.total / maxVal) * 112));
          const tip = `${s.label}: R$ ${s.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
          return (
            <div
              key={s.key}
              className="flex flex-1 flex-col items-center justify-end gap-2 min-w-0 h-full"
            >
              <div
                className="w-full max-w-[44px] mx-auto rounded-t-lg bg-gradient-to-t from-primary/80 to-primary/40 transition-all"
                style={{ height: barPx }}
                title={tip}
              />
              <span className="text-[10px] text-muted-foreground font-light text-center leading-tight truncate w-full">
                {s.label.replace(".", "")}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
