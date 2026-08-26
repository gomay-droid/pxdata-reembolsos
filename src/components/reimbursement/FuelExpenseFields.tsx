import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FuelConsumptionLimits } from "@/lib/fuelConfig";
import {
  assessFuelConsumption,
  formatKm,
  formatKmPerLiter,
  formatLiters,
  parseFuelNumber,
} from "@/lib/fuelConsumption";
import { cn } from "@/lib/utils";
import { Fuel } from "lucide-react";

type FuelFields = {
  odometerStart?: string;
  odometerEnd?: string;
  litersFilled?: string;
};

type Props = {
  values: FuelFields;
  onChange?: (field: keyof FuelFields, value: string) => void;
  limits?: Partial<FuelConsumptionLimits> | null;
  /** Exibe valor da nota junto ao resumo (revisão / admin). */
  amountLabel?: string;
  readOnly?: boolean;
  className?: string;
};

export function FuelExpenseFields({
  values,
  onChange,
  limits,
  amountLabel,
  readOnly = false,
  className,
}: Props) {
  const assessment = assessFuelConsumption({
    odometerStart: values.odometerStart,
    odometerEnd: values.odometerEnd,
    litersFilled: values.litersFilled,
    limits,
  });

  const litersNum = parseFuelNumber(values.litersFilled);

  return (
    <div
      className={cn(
        "md:col-span-2 space-y-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Fuel className="h-4 w-4 text-amber-700 dark:text-amber-400" />
        <p className="text-sm font-medium text-foreground">Dados do abastecimento</p>
      </div>

      {amountLabel && (
        <p className="text-xs text-muted-foreground">
          Valor da nota: <span className="font-medium text-foreground">{amountLabel}</span>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quilometragem inicial (km)</Label>
          {readOnly ? (
            <p className="text-sm tabular-nums text-foreground">
              {values.odometerStart?.trim() || "—"}
            </p>
          ) : (
            <Input
              type="number"
              step="0.1"
              min="0"
              value={values.odometerStart ?? ""}
              onChange={(e) => onChange?.("odometerStart", e.target.value)}
              placeholder="Ex.: 45200"
              className="bg-secondary border-border font-light"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quilometragem final (km)</Label>
          {readOnly ? (
            <p className="text-sm tabular-nums text-foreground">
              {values.odometerEnd?.trim() || "—"}
            </p>
          ) : (
            <Input
              type="number"
              step="0.1"
              min="0"
              value={values.odometerEnd ?? ""}
              onChange={(e) => onChange?.("odometerEnd", e.target.value)}
              placeholder="Ex.: 45480"
              className="bg-secondary border-border font-light"
            />
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Litros abastecidos</Label>
          {readOnly ? (
            <p className="text-sm tabular-nums text-foreground">{formatLiters(litersNum)}</p>
          ) : (
            <Input
              type="number"
              step="0.01"
              min="0"
              value={values.litersFilled ?? ""}
              onChange={(e) => onChange?.("litersFilled", e.target.value)}
              placeholder="Ex.: 45,67"
              className="bg-secondary border-border font-light"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Quilômetros percorridos
          </p>
          <p className="text-base font-medium tabular-nums text-foreground mt-0.5">
            {formatKm(assessment.kmTraveled)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-background/70 px-3 py-2.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Consumo médio
          </p>
          <p className="text-base font-medium tabular-nums text-foreground mt-0.5">
            {formatKmPerLiter(assessment.avgKmPerLiter)}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border px-3 py-2.5 text-sm",
          assessment.level === "ok" &&
            "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
          assessment.level === "warning" &&
            "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-200",
          assessment.level === "incomplete" &&
            "border-border bg-muted/30 text-muted-foreground"
        )}
        role="status"
      >
        {assessment.level === "ok" && (
          <p>
            <span aria-hidden>🟢 </span>
            Consumo médio dentro da faixa esperada.
          </p>
        )}
        {assessment.level === "warning" && (
          <p>
            <span aria-hidden>🟡 </span>
            {assessment.message}
          </p>
        )}
        {assessment.level === "incomplete" && <p>{assessment.message}</p>}
      </div>
    </div>
  );
}
