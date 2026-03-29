import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Reimbursement } from "@/types/reimbursement";
import { ReimbursementList } from "@/components/reimbursement/ReimbursementList";
import type { AdminMetrics } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { ExpenseEmailModal } from "@/components/admin/ExpenseEmailModal";
import type { ExpenseEmailKind } from "@/lib/expenseEmailTemplates";
import {
  apiStatusForDecision,
  expenseEmailKindForReimbursementStatus,
  toastMessageForDecision,
  type AdminReimbursementDecision,
} from "@/lib/adminReimbursementDecision";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Mail,
  MessageSquareWarning,
  Shield,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatReimbursementDate } from "@/lib/formatLocalDate";
import { CompanySettingsPanel } from "@/components/admin/CompanySettingsPanel";
import { BrandLogoMark } from "@/components/BrandLogoMark";
import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";
import { apiUrl, assetUrl } from "@/lib/apiBase";

type AdminTab = "despesas" | "dashboard" | "empresa";

function adminTabFromLocation(loc: { pathname: string; search: string }): AdminTab {
  const p = loc.pathname.replace(/\/$/, "");
  if (p.endsWith("/admin/empresa")) return "empresa";
  const q = new URLSearchParams(loc.search);
  if (q.get("tab") === "dashboard") return "dashboard";
  return "despesas";
}

type AdminReimbursementDetails = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterDocument: string;
  requesterAddress?: string | null;
  status: Reimbursement["status"];
  totalAmount: number;
  createdAt: string;
  expenses: Array<{
    id: number;
    description: string;
    expenseLine: string;
    accountCode?: string | null;
    amount: number;
    attachments?: Array<{
      id: number;
      originalName: string;
      mimeType: string;
      size: number;
      url: string;
    }>;
  }>;
};

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, logout } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const [tab, setTab] = useState<AdminTab>(() => adminTabFromLocation(location));

  useEffect(() => {
    setTab(adminTabFromLocation(location));
  }, [location.pathname, location.search]);

  const selectTab = useCallback(
    (t: AdminTab) => {
      if (t === "empresa") navigate("/admin/empresa", { replace: true });
      else if (t === "dashboard") navigate("/admin?tab=dashboard", { replace: true });
      else navigate("/admin", { replace: true });
    },
    [navigate]
  );

  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [selected, setSelected] = useState<AdminReimbursementDetails | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [expenseEmailModal, setExpenseEmailModal] = useState<{
    kind: ExpenseEmailKind;
    expenseDescription: string;
  } | null>(null);

  /** Bloqueia segundo clique antes do re-render (PATCH em andamento). */
  const statusPatchLockRef = useRef(false);
  const [patchingDecision, setPatchingDecision] = useState<AdminReimbursementDecision | null>(null);

  const submitAdminDecision = useCallback(
    async (decision: AdminReimbursementDecision) => {
      if (!selected || statusPatchLockRef.current) return;
      statusPatchLockRef.current = true;
      setPatchingDecision(decision);
      const reimbursementId = selected.id;
      try {
        const status = apiStatusForDecision(decision);
        const res = await fetch(
          apiUrl(`/api/admin/reimbursements/${encodeURIComponent(reimbursementId)}/status`),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status }),
          }
        );
        const data = (await res.json().catch(() => ({}))) as { error?: string; status?: string };
        if (!res.ok) {
          toast.error(data.error ?? "Não foi possível atualizar o status");
          return;
        }
        const newStatus = (data.status ?? status) as Reimbursement["status"];
        setSelected((prev) =>
          prev && prev.id === reimbursementId ? { ...prev, status: newStatus } : prev
        );
        setReimbursements((prev) =>
          prev.map((r) => (r.id === reimbursementId ? { ...r, status: newStatus } : r))
        );
        toast.success(toastMessageForDecision(decision));
      } finally {
        statusPatchLockRef.current = false;
        setPatchingDecision(null);
      }
    },
    [selected]
  );

  const closeDetails = useCallback(() => {
    setExpenseEmailModal(null);
    setSelected(null);
  }, []);

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsLoaded, setMetricsLoaded] = useState(false);

  const loadIsAdmin = useCallback(async () => {
    setAdminLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/is-admin"), { credentials: "include" });
      if (!res.ok) {
        setIsAdmin(false);
        return;
      }
      const data = (await res.json()) as { isAdmin: boolean };
      setIsAdmin(Boolean(data.isAdmin));
    } catch {
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoadingExpenses(true);
    try {
      const res = await fetch(apiUrl("/api/admin/reimbursements"), { credentials: "include" });
      if (!res.ok) {
        setReimbursements([]);
        return;
      }
      const data = (await res.json()) as Reimbursement[];
      setReimbursements(data);
    } finally {
      setLoadingExpenses(false);
      setExpensesLoaded(true);
    }
  }, []);

  const openDetails = useCallback(async (r: Reimbursement) => {
    setLoadingSelected(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/reimbursements/${encodeURIComponent(r.id)}`), {
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as AdminReimbursementDetails & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível carregar os detalhes");
        return;
      }
      setSelected(data);
    } finally {
      setLoadingSelected(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch(apiUrl("/api/admin/metrics"), { credentials: "include" });
      if (!res.ok) {
        setMetrics(null);
        return;
      }
      const data = (await res.json()) as AdminMetrics;
      setMetrics(data);
    } finally {
      setLoadingMetrics(false);
      setMetricsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void loadIsAdmin();
    }
  }, [user, loadIsAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if ((tab === "despesas" || tab === "dashboard") && !expensesLoaded && !loadingExpenses) {
      void loadExpenses();
    }
    if (tab === "dashboard" && !metricsLoaded && !loadingMetrics) {
      void loadMetrics();
    }
  }, [isAdmin, tab, expensesLoaded, metricsLoaded, loadingExpenses, loadingMetrics, loadExpenses, loadMetrics]);

  useEffect(() => {
    if (!user && !loading) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading || adminLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 text-center">
        <div className="max-w-md w-full space-y-6 rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-center justify-center gap-3">
            <Shield className="h-5 w-5 text-destructive" />
            <h1 className="text-lg font-medium text-foreground">Acesso negado</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Apenas usuários do financeiro podem acessar esta área administrativa.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button type="button" onClick={() => navigate("/")} className="rounded-xl gap-2">
              Voltar
            </Button>
            <Button type="button" variant="ghost" onClick={() => void logout()} className="rounded-xl gap-2">
              <X className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="rounded-xl gap-2"
            >
              Voltar
            </Button>
            <BrandLogoMark size="sm" />
            <span className="text-sm font-medium text-foreground truncate">Administração</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void logout()}
              className="rounded-xl gap-2 text-muted-foreground"
              title="Sair"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-6">
        <div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-medium text-foreground tracking-tight">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground mt-1 font-light">
                {tab === "empresa"
                  ? "Edite nome, endereço, CNPJ e e-mail exibidos no formulário de reembolso"
                  : tab === "dashboard"
                    ? "Visão geral, status e evolução dos reembolsos"
                    : "Gerencie despesas e acompanhe métricas"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={tab === "despesas" ? "default" : "outline"}
                size="sm"
                onClick={() => selectTab("despesas")}
                className="rounded-xl"
              >
                Despesas
              </Button>
              <Button
                type="button"
                variant={tab === "dashboard" ? "default" : "outline"}
                size="sm"
                onClick={() => selectTab("dashboard")}
                className="rounded-xl"
              >
                Dashboard
              </Button>
              <Button
                type="button"
                variant={tab === "empresa" ? "default" : "outline"}
                size="sm"
                onClick={() => selectTab("empresa")}
                className="rounded-xl"
              >
                Dados da Empresa
              </Button>
            </div>
          </div>
        </div>

        {tab === "despesas" && (
          <section className="space-y-4">
            {loadingExpenses ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ReimbursementList reimbursements={reimbursements} onSelect={openDetails} />
            )}
          </section>
        )}

        {tab === "dashboard" && (
          <section className="space-y-4">
            <AdminDashboard
              metrics={metrics}
              reimbursements={reimbursements}
              metricsLoaded={metricsLoaded}
              onOpenReimbursement={openDetails}
            />
          </section>
        )}

        {tab === "empresa" && (
          <section className="space-y-4">
            <CompanySettingsPanel />
          </section>
        )}
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={() => closeDetails()}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-refined-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 p-6 border-b border-border">
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-foreground truncate">{selected.id}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selected.requesterName} · {selected.requesterEmail}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl h-9 w-9 p-0"
                onClick={() => closeDetails()}
                aria-label="Fechar"
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-auto overscroll-contain p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">CPF/CNPJ</p>
                  <p className="text-sm text-foreground mt-1">{selected.requesterDocument}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Data</p>
                  <p className="text-sm text-foreground mt-1">
                    {formatReimbursementDate(selected.createdAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  <p className="text-sm text-foreground mt-1">{selected.status}</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                  <p className="text-sm text-foreground mt-1">
                    R$ {selected.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {selected.requesterAddress && (
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Endereço</p>
                  <p className="text-sm text-foreground mt-1">{selected.requesterAddress}</p>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Itens</h3>
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="divide-y divide-border">
                    {selected.expenses.map((e) => (
                      <div key={e.id} className="p-4 bg-card space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground font-medium truncate">{e.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {e.expenseLine}
                              {e.accountCode ? ` · ${e.accountCode}` : ""}
                            </p>
                          </div>
                          <div className="text-sm text-foreground shrink-0 sm:text-right tabular-nums">
                            R$ {e.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/15 p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Comprovante desta despesa
                          </p>
                          {e.attachments && e.attachments.length > 0 ? (
                            <div className="space-y-2">
                              {e.attachments.map((a) => (
                                <div
                                  key={a.id}
                                  className="flex items-center justify-between gap-3 text-sm"
                                >
                                  <span className="truncate text-foreground">{a.originalName}</span>
                                  <a href={assetUrl(a.url)} download target="_blank" rel="noreferrer" className="shrink-0">
                                    <Button type="button" size="sm" variant="secondary" className="rounded-xl gap-1.5 h-8">
                                      <Download className="h-3.5 w-3.5" />
                                      Baixar
                                    </Button>
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border/80 bg-background/60 px-3 py-2.5 text-xs text-muted-foreground font-light">
                              <FileText className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                              <span>Nenhum arquivo vinculado a este item.</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={patchingDecision !== null}
                            className="rounded-xl gap-1.5 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                            onClick={() => void submitAdminDecision("approve")}
                          >
                            {patchingDecision === "approve" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                            Aprovar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={patchingDecision !== null}
                            className="rounded-xl gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => void submitAdminDecision("reject")}
                          >
                            {patchingDecision === "reject" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            Reprovar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={patchingDecision !== null}
                            className="rounded-xl gap-1.5 border-amber-500/40 text-amber-800 hover:bg-amber-500/10 dark:text-amber-400"
                            onClick={() => void submitAdminDecision("contest")}
                          >
                            {patchingDecision === "contest" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MessageSquareWarning className="h-3.5 w-3.5" />
                            )}
                            Contestar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={patchingDecision !== null}
                            className="rounded-xl gap-1.5 border-border/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            onClick={() =>
                              setExpenseEmailModal({
                                kind: expenseEmailKindForReimbursementStatus(selected.status),
                                expenseDescription: e.description,
                              })
                            }
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Notificar por e-mail
                          </Button>
                        </div>
                      </div>
                    ))}
                    {selected.expenses.length === 0 && (
                      <div className="p-4 text-sm text-muted-foreground">Sem itens.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && expenseEmailModal && (
        <ExpenseEmailModal
          open
          onClose={() => setExpenseEmailModal(null)}
          kind={expenseEmailModal.kind}
          collaboratorName={selected.requesterName}
          collaboratorEmail={selected.requesterEmail}
          expenseDescription={expenseEmailModal.expenseDescription}
        />
      )}

      {loadingSelected && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-end p-4">
          <div className="rounded-2xl bg-card/90 border border-border shadow-refined px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando detalhes…
          </div>
        </div>
      )}
    </div>
  );
}

