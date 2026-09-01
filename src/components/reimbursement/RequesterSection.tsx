import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BANK_ACCOUNT_TYPES } from "@/lib/bankDetails";
import type { ReimbursementFormData } from "@/types/reimbursement";

type RequesterField = keyof Omit<ReimbursementFormData, "expenses">;

interface Props {
  name: string;
  address: string;
  document: string;
  email: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankAccountType: string;
  bankAccountHolder: string;
  errors: Record<string, string>;
  onUpdate: (field: RequesterField, value: string) => void;
}

export function RequesterSection({
  name,
  address,
  document,
  email,
  bankName,
  bankAgency,
  bankAccount,
  bankAccountType,
  bankAccountHolder,
  errors,
  onUpdate,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <User className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h3 className="text-base font-medium text-foreground">Dados do Solicitante</h3>
          <p className="text-sm text-muted-foreground">Preencha suas informações e dados bancários</p>
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
            className="bg-secondary border-border font-light"
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
            className="bg-secondary border-border font-light"
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
            className="bg-secondary border-border font-light"
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
            className="bg-secondary border-border font-light"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        <div className="space-y-2">
          <Label htmlFor="bankName" className="text-sm text-muted-foreground">
            Banco *
          </Label>
          <Input
            id="bankName"
            value={bankName}
            onChange={(e) => onUpdate("bankName", e.target.value)}
            placeholder="Nome do banco"
            className="bg-secondary border-border font-light"
          />
          {errors.bankName && <p className="text-xs text-destructive">{errors.bankName}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankAgency" className="text-sm text-muted-foreground">
            Agência *
          </Label>
          <Input
            id="bankAgency"
            value={bankAgency}
            onChange={(e) => onUpdate("bankAgency", e.target.value)}
            placeholder="0000"
            className="bg-secondary border-border font-light"
          />
          {errors.bankAgency && <p className="text-xs text-destructive">{errors.bankAgency}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankAccount" className="text-sm text-muted-foreground">
            Conta *
          </Label>
          <Input
            id="bankAccount"
            value={bankAccount}
            onChange={(e) => onUpdate("bankAccount", e.target.value)}
            placeholder="00000-0"
            className="bg-secondary border-border font-light"
          />
          {errors.bankAccount && <p className="text-xs text-destructive">{errors.bankAccount}</p>}
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Tipo de conta *</Label>
          <Select
            value={bankAccountType || undefined}
            onValueChange={(v) => onUpdate("bankAccountType", v)}
          >
            <SelectTrigger className="bg-secondary border-border font-light rounded-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {BANK_ACCOUNT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bankAccountType && (
            <p className="text-xs text-destructive">{errors.bankAccountType}</p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="bankAccountHolder" className="text-sm text-muted-foreground">
            Titular da conta *
          </Label>
          <Input
            id="bankAccountHolder"
            value={bankAccountHolder}
            onChange={(e) => onUpdate("bankAccountHolder", e.target.value)}
            placeholder="Nome do titular (como no banco)"
            className="bg-secondary border-border font-light"
          />
          {errors.bankAccountHolder && (
            <p className="text-xs text-destructive">{errors.bankAccountHolder}</p>
          )}
        </div>
      </div>
    </div>
  );
}
