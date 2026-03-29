import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";

interface Props {
  name: string;
  address: string;
  document: string;
  email: string;
  errors: Record<string, string>;
  onUpdate: (
    field: "requesterName" | "requesterAddress" | "requesterDocument" | "requesterEmail",
    value: string
  ) => void;
}

export function RequesterSection({ name, address, document, email, errors, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Dados do Solicitante</h3>
          <p className="text-sm text-muted-foreground">Preencha suas informações</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-muted-foreground">
            Nome completo *
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => onUpdate("requesterName", e.target.value)}
            placeholder="Seu nome completo"
            className="h-12 rounded-xl bg-secondary border-border font-light"
          />
          {errors.requesterName && <p className="text-xs text-destructive">{errors.requesterName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-muted-foreground">
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onUpdate("requesterEmail", e.target.value)}
            placeholder="seu@email.com"
            className="h-12 rounded-xl bg-secondary border-border font-light"
          />
          {errors.requesterEmail && (
            <p className="text-xs text-destructive">{errors.requesterEmail}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="document" className="text-sm text-muted-foreground">
            CPF/CNPJ *
          </Label>
          <Input
            id="document"
            value={document}
            onChange={(e) => onUpdate("requesterDocument", e.target.value)}
            placeholder="000.000.000-00"
            className="h-12 rounded-xl bg-secondary border-border font-light"
          />
          {errors.requesterDocument && (
            <p className="text-xs text-destructive">{errors.requesterDocument}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm text-muted-foreground">
            Endereço
          </Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => onUpdate("requesterAddress", e.target.value)}
            placeholder="Seu endereço"
            className="h-12 rounded-xl bg-secondary border-border font-light"
          />
        </div>
      </div>
    </div>
  );
}
