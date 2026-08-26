import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CompanyProfile } from "@/types/company";
import { DEFAULT_FUEL_CONSUMPTION_LIMITS } from "@/lib/fuelConfig";
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
    fuelMinKmPerLiter: DEFAULT_FUEL_CONSUMPTION_LIMITS.minKmPerLiter,
    fuelMaxKmPerLiter: DEFAULT_FUEL_CONSUMPTION_LIMITS.maxKmPerLiter,
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/admin/company"), { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as CompanyProfile;
          setForm({
            name: data.name,
            address: data.address,
            cnpj: data.cnpj,
            email: data.email,
            fuelMinKmPerLiter:
              data.fuelMinKmPerLiter ?? DEFAULT_FUEL_CONSUMPTION_LIMITS.minKmPerLiter,
            fuelMaxKmPerLiter:
              data.fuelMaxKmPerLiter ?? DEFAULT_FUEL_CONSUMPTION_LIMITS.maxKmPerLiter,
          });
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

  const update = (field: keyof CompanyProfile, value: string | number) => {
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
        fuelMinKmPerLiter:
          data.fuelMinKmPerLiter ?? DEFAULT_FUEL_CONSUMPTION_LIMITS.minKmPerLiter,
        fuelMaxKmPerLiter:
          data.fuelMaxKmPerLiter ?? DEFAULT_FUEL_CONSUMPTION_LIMITS.maxKmPerLiter,
      });
      toast.success(
        "Dados da empresa atualizados. O formulário de reembolso passará a exibir estas informações."
      );
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
            autoComplete="organization"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="co-address">Endereço</Label>
          <Input
            id="co-address"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            autoComplete="street-address"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="co-cnpj">CNPJ</Label>
          <Input
            id="co-cnpj"
            value={form.cnpj}
            onChange={(e) => update("cnpj", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="co-email">E-mail</Label>
          <Input
            id="co-email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className="pt-2 border-t border-border space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Alertas de combustível (km/L)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faixa esperada de consumo médio. Fora dela, o sistema só alerta — não bloqueia o envio.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="co-fuel-min">Consumo mínimo esperado (km/L)</Label>
              <Input
                id="co-fuel-min"
                type="number"
                step="0.1"
                min="0.1"
                value={form.fuelMinKmPerLiter ?? DEFAULT_FUEL_CONSUMPTION_LIMITS.minKmPerLiter}
                onChange={(e) => update("fuelMinKmPerLiter", Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="co-fuel-max">Consumo máximo esperado (km/L)</Label>
              <Input
                id="co-fuel-max"
                type="number"
                step="0.1"
                min="0.1"
                value={form.fuelMaxKmPerLiter ?? DEFAULT_FUEL_CONSUMPTION_LIMITS.maxKmPerLiter}
                onChange={(e) => update("fuelMaxKmPerLiter", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <Button
          type="button"
          className="gap-2"
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
