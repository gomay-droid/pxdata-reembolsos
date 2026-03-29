/**
 * Formata data de reembolso para pt-BR no fuso do navegador.
 * A API envia instante ISO (UTC); usar só YYYY-MM-DD em UTC mostrava o dia “errado” à noite no Brasil.
 */
export function formatReimbursementDate(isoOrDate: string): string {
  const s = isoOrDate.trim();
  if (!s) return "";
  const withTime =
    /^\d{4}-\d{2}-\d{2}$/.test(s) && !s.includes("T") ? `${s}T12:00:00` : s;
  const d = new Date(withTime);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("pt-BR");
}
