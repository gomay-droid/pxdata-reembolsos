import { useCallback, useEffect, useState } from "react";
import ReimbursementForm from "@/components/reimbursement/ReimbursementForm";
import { ReimbursementList } from "@/components/reimbursement/ReimbursementList";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, List, Loader2, LogOut, Plus, Settings } from "lucide-react";
import type { Reimbursement } from "@/types/reimbursement";
import type { CompanyProfile } from "@/types/company";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BrandLogoMark } from "@/components/BrandLogoMark";
import { apiUrl } from "@/lib/apiBase";

type View = "form" | "list";

const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const view: View = searchParams.get("view") === "list" ? "list" : "form";

  const setView = useCallback(
    (v: View) => {
      if (v === "list") setSearchParams({ view: "list" }, { replace: true });
      else setSearchParams({}, { replace: true });
    },
    [setSearchParams]
  );

  const { user, loading, refresh, logout } = useAuth();
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);

  const loadReimbursements = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const res = await fetch(apiUrl("/api/reimbursements"), { credentials: "include" });
      if (res.status === 401) {
        setReimbursements([]);
        setListError(null);
        await refresh();
        return;
      }
      if (!res.ok) throw new Error("Falha ao carregar");
      const data = (await res.json()) as Reimbursement[];
      setReimbursements(data);
    } catch {
      setListError("Não foi possível carregar o histórico. O servidor está rodando?");
      setReimbursements([]);
    } finally {
      setLoadingList(false);
    }
  }, [refresh]);

  useEffect(() => {
    if (user && view === "list") {
      void loadReimbursements();
    }
  }, [view, user, loadReimbursements]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
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
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCompany(null);
      return;
    }
    setCompanyLoading(true);
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/company"), { credentials: "include" });
        if (res.ok) {
          setCompany((await res.json()) as CompanyProfile);
        } else {
          setCompany(null);
        }
      } catch {
        setCompany(null);
      } finally {
        setCompanyLoading(false);
      }
    })();
  }, [user]);

  if (!GOOGLE_CONFIGURED) {
    return (
      <LoginScreen
        configError={
          "Configure o Google OAuth: crie um arquivo .env na raiz do projeto com GOOGLE_CLIENT_ID e VITE_GOOGLE_CLIENT_ID (mesmo ID do cliente OAuth Web) e SESSION_SECRET. Reinicie o servidor após salvar."
        }
        onLoggedIn={() => {}}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoggedIn={() => void refresh()} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandLogoMark size="sm" />
            <span className="text-sm font-medium text-foreground truncate">Reembolsos</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-[180px]">
              {user.email}
            </span>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className="rounded-xl gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Histórico</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isAdmin) {
                  navigate("/admin");
                  return;
                }
                toast.error("Você não tem autorização para acessar a página de Administração.");
              }}
              className="rounded-xl h-9 w-9 p-0"
              title="Administração"
              aria-label="Administração"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void logout()}
              className="rounded-xl gap-2 text-muted-foreground"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
            <Link
              to="/lab/extracao"
              className="hidden lg:inline text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              Lab extração
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {view === "form" ? (
          <ReimbursementForm
            authProfile={{ email: user.email, name: user.name }}
            companyProfile={company}
            companyLoading={companyLoading}
            onSubmitted={async () => {
              await loadReimbursements();
              setView("list");
            }}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-2 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setView("form")}
                    className="rounded-xl gap-2 shrink-0 -ml-2 text-muted-foreground hover:text-foreground"
                    aria-label="Voltar para a solicitação"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Voltar</span>
                  </Button>
                  <div className="min-w-0 pt-0.5">
                    <h1 className="text-2xl font-medium text-foreground tracking-tight">
                      Histórico de Reembolsos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 font-light">
                      {loadingList ? "Carregando…" : `${reimbursements.length} solicitações registradas`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setView("form")}
                  className="rounded-xl gap-2 w-full sm:w-auto shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Nova solicitação
                </Button>
              </div>
            </div>
            {listError && <p className="text-sm text-destructive">{listError}</p>}
            {loadingList ? (
              <div className="flex justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ReimbursementList reimbursements={reimbursements} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
