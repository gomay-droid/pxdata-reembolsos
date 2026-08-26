import {
  resolveFuelConsumptionLimits,
  type FuelConsumptionLimits,
} from "@/lib/fuelConfig";
import { parseExpenseAmount } from "@/lib/expenseAmount";

/** Linha de catálogo para abastecimento. */
export const FUEL_EXPENSE_LINE = "COMBUSTÍVEL";

export function isFuelExpenseLine(line: string | null | undefined): boolean {
  if (!line?.trim()) return false;
  const normalized = line
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return normalized === "COMBUSTIVEL";
}

export type FuelConsumptionAlertLevel = "ok" | "warning" | "incomplete";

export type FuelConsumptionAssessment = {
  kmTraveled: number | null;
  avgKmPerLiter: number | null;
  level: FuelConsumptionAlertLevel;
  message: string;
};

export function parseFuelNumber(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  const n = parseExpenseAmount(raw);
  return Number.isFinite(n) ? n : null;
}

export function computeKmTraveled(
  odometerStart: string | number | null | undefined,
  odometerEnd: string | number | null | undefined
): number | null {
  const start = parseFuelNumber(odometerStart);
  const end = parseFuelNumber(odometerEnd);
  if (start === null || end === null) return null;
  const delta = end - start;
  return delta >= 0 ? delta : null;
}

export function computeAvgKmPerLiter(
  kmTraveled: number | null,
  litersFilled: string | number | null | undefined
): number | null {
  const liters = parseFuelNumber(litersFilled);
  if (kmTraveled === null || liters === null || liters <= 0) return null;
  return kmTraveled / liters;
}

/**
 * Avalia consumo vs. limites configuráveis.
 * Nunca bloqueia envio — apenas informa (ok / warning / incomplete).
 */
export function assessFuelConsumption(input: {
  odometerStart?: string | number | null;
  odometerEnd?: string | number | null;
  litersFilled?: string | number | null;
  limits?: Partial<FuelConsumptionLimits> | null;
}): FuelConsumptionAssessment {
  const limits = resolveFuelConsumptionLimits(input.limits);
  const kmTraveled = computeKmTraveled(input.odometerStart, input.odometerEnd);
  const avgKmPerLiter = computeAvgKmPerLiter(kmTraveled, input.litersFilled);

  if (kmTraveled === null || avgKmPerLiter === null) {
    return {
      kmTraveled,
      avgKmPerLiter,
      level: "incomplete",
      message:
        "Informe quilometragem inicial/final e litros abastecidos para calcular o consumo médio.",
    };
  }

  if (avgKmPerLiter < limits.minKmPerLiter || avgKmPerLiter > limits.maxKmPerLiter) {
    return {
      kmTraveled,
      avgKmPerLiter,
      level: "warning",
      message: `O consumo calculado está fora da faixa esperada (${limits.minKmPerLiter}–${limits.maxKmPerLiter} km/L). Confira a quilometragem ou a quantidade de litros informada.`,
    };
  }

  return {
    kmTraveled,
    avgKmPerLiter,
    level: "ok",
    message: "Consumo médio dentro da faixa esperada.",
  };
}

export function formatKmPerLiter(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km/L`;
}

export function formatKm(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} km`;
}

export function formatLiters(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} L`;
}
