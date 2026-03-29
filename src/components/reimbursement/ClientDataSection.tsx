import type { CompanyProfile } from "@/types/company";
import { Building2, Loader2 } from "lucide-react";

type Props = {
  company: CompanyProfile | null;
  loading?: boolean;
};

export function ClientDataSection({ company, loading }: Props) {
  return (
    <div className="rounded-2xl bg-accent/50 border border-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Dados do Cliente</h3>
          <p className="text-sm text-muted-foreground">Informações pré-preenchidas</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dados da empresa…
        </div>
      ) : company ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Razão Social</span>
            <p className="text-sm font-normal text-foreground">{company.name}</p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">CNPJ</span>
            <p className="text-sm font-normal text-foreground">{company.cnpj}</p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Endereço</span>
            <p className="text-sm font-normal text-foreground">{company.address}</p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Email</span>
            <p className="text-sm font-normal text-foreground">{company.email}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-destructive">
          Não foi possível carregar os dados da empresa. Tente atualizar a página ou contate o suporte.
        </p>
      )}
    </div>
  );
}
