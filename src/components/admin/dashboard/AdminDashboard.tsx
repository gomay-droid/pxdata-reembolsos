import type { AdminMetrics } from "@/types/admin";
import type { Reimbursement } from "@/types/reimbursement";
import { Loader2 } from "lucide-react";
import { AdminDashboardSummaryCards } from "./AdminDashboardSummaryCards";
import { AdminDashboardRecentList } from "./AdminDashboardRecentList";
import { AdminDashboardStatusBreakdown } from "./AdminDashboardStatusBreakdown";
import { AdminDashboardVolumeChart } from "./AdminDashboardVolumeChart";
import { cn } from "@/lib/utils";

interface Props {
  metrics: AdminMetrics | null;
  reimbursements: Reimbursement[];
  metricsLoaded: boolean;
  onOpenReimbursement?: (r: Reimbursement) => void;
  className?: string;
}

export function AdminDashboard({
  metrics,
  reimbursements,
  metricsLoaded,
  onOpenReimbursement,
  className,
}: Props) {
  if (!metrics) {
    if (metricsLoaded) {
      return (
        <p className={cn("text-sm text-muted-foreground font-light", className)}>
          Não foi possível carregar as métricas. Verifique a conexão com a API.
        </p>
      );
    }
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-20 text-muted-foreground gap-3",
          className
        )}
      >
        <Loader2 className="h-9 w-9 animate-spin text-primary/70" />
        <p className="text-sm font-light">Carregando visão geral…</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      <div className="space-y-2">
        <h2 className="text-lg font-medium text-foreground tracking-tight">
          Visão geral
        </h2>
        <p className="text-sm text-muted-foreground font-light max-w-2xl">
          Números consolidados para o financeiro e leitura rápida do pipeline de
          reembolsos.
        </p>
      </div>

      <AdminDashboardSummaryCards metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <AdminDashboardRecentList
          reimbursements={reimbursements}
          onSelect={onOpenReimbursement}
        />
        <AdminDashboardStatusBreakdown metrics={metrics} />
      </div>

      <AdminDashboardVolumeChart reimbursements={reimbursements} />
    </div>
  );
}
