/**
 * Infere um nome legível a partir do local-part do e-mail (ex.: joao.silva@px → Joao Silva).
 * Útil quando o padrão da empresa é nome.sobrenome@domínio.
 */
export function inferDisplayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  if (!local) return "";

  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
