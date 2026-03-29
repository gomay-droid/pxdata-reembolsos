import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyProfile } from "@/types/company";
import { Building2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";

export function CompanySettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyProfile>({
    name: "",
    address: "",
    cnpj: "",
    email: "",
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/admin/company"), { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as CompanyProfile;
          setForm(data);
        } else {
          toast.error("Não foi possível carregar os dados da empresa");
        }
      } catch {
        toast.error("Erro de rede ao carregar dados da empresa");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = (field: keyof CompanyProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/admin/company"), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => ({}))) as CompanyProfile & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao salvar");
        return;
      }
      setForm({
        name: data.name,
        address: data.address,
        cnpj: data.cnpj,
        email: data.email,
      });
      toast.success("Dados da empresa atualizados. O formulário de reembolso passará a exibir estas informações.");
    } catch {
      toast.error("Erro de rede ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-foreground">Dados da Empresa</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Estas informações aparecem no bloco &quot;Dados do Cliente&quot; do formulário de reembolso para
            todos os colaboradores autenticados.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-refined space-y-5 max-w-2xl">
        <div className="space-y-2">
          <Label htmlFor="co-name">Nome da empresa</Label>
          <Input
            id="co-name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="rounded-xl"
            autoComplete="organization"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="co-address">Endereço</Label>
          <Input
            id="co-address"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="rounded-xl"
            autoComplete="street-address"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="co-cnpj">CNPJ</Label>
          <Input
            id="co-cnpj"
            value={form.cnpj}
            onChange={(e) => update("cnpj", e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="co-email">E-mail</Label>
          <Input
            id="co-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="rounded-xl"
            autoComplete="email"
          />
        </div>

        <Button
          type="button"
          className="rounded-xl gap-2"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar alterações
        </Button>
      </div>
    </section>
  );
}
