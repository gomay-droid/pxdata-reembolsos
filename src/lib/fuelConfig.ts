/** Limites de consumo (km/L) — fonte única de defaults; valores reais vêm da config da empresa. */
export type FuelConsumptionLimits = {
  minKmPerLiter: number;
  maxKmPerLiter: number;
};

/** Defaults usados quando a empresa ainda não configurou limites. */
export const DEFAULT_FUEL_CONSUMPTION_LIMITS: FuelConsumptionLimits = {
  minKmPerLiter: 8,
  maxKmPerLiter: 18,
};

export function resolveFuelConsumptionLimits(
  partial?: Partial<FuelConsumptionLimits> | null
): FuelConsumptionLimits {
  const min =
    typeof partial?.minKmPerLiter === "number" && Number.isFinite(partial.minKmPerLiter)
      ? partial.minKmPerLiter
      : DEFAULT_FUEL_CONSUMPTION_LIMITS.minKmPerLiter;
  const max =
    typeof partial?.maxKmPerLiter === "number" && Number.isFinite(partial.maxKmPerLiter)
      ? partial.maxKmPerLiter
      : DEFAULT_FUEL_CONSUMPTION_LIMITS.maxKmPerLiter;
  return {
    minKmPerLiter: Math.min(min, max),
    maxKmPerLiter: Math.max(min, max),
  };
}
