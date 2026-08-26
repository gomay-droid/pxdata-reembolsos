export type CompanyProfile = {
  name: string;
  address: string;
  cnpj: string;
  email: string;
  /** Limites de consumo (km/L) para alertas de combustível. */
  fuelMinKmPerLiter?: number;
  fuelMaxKmPerLiter?: number;
};
