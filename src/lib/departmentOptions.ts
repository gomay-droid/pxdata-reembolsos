/** Departamento ou finalidade da despesa (substitui conta contábil no formulário). */
export const DEPARTMENT_OPTIONS = [
  "Lúria",
  "Hub",
  "PID",
  "Comercial",
  "Administrativo",
] as const;

export type DepartmentOption = (typeof DEPARTMENT_OPTIONS)[number];

export function isDepartmentOption(value: string): value is DepartmentOption {
  return (DEPARTMENT_OPTIONS as readonly string[]).includes(value);
}
