export type ExpenseEmailKind = "approve" | "reject" | "contest";

export function getExpenseEmailSubject(kind: ExpenseEmailKind): string {
  switch (kind) {
    case "approve":
      return "Sua despesa foi aprovada! – PX Data";
    case "reject":
      return "Atualização sobre sua solicitação de reembolso – PX Data";
    case "contest":
      return "Precisamos de mais informações sobre sua despesa – PX Data";
    default:
      return "";
  }
}

/** Corpo pré-preenchido; em reprovar/contestar o admin substitui os trechos entre colchetes. */
export function getExpenseEmailBody(kind: ExpenseEmailKind, collaboratorName: string): string {
  const name = collaboratorName.trim();
  switch (kind) {
    case "approve":
      return `Olá, ${name}!

Temos boas notícias! Sua despesa foi revisada e aceita pelo time financeiro da PX Data.

O pagamento seguirá o fluxo padrão de reembolsos da empresa.

Qualquer dúvida, estou à disposição!`;
    case "reject":
      return `Olá, ${name},

Informamos que sua despesa não foi aprovada pelo time financeiro.

Motivo da reprovação: [Inserir motivo, ex: nota fiscal ilegível / despesa fora da política da empresa].

Caso você possua o comprovante correto ou queira reenviar a solicitação com os ajustes necessários, basta realizar um novo pedido no sistema.

Qualquer dúvida, estou à disposição!`;
    case "contest":
      return `Olá, ${name},

Sua solicitação de reembolso entrou em estado de contestação. Isso não significa que ela foi negada, mas que o time financeiro identificou uma divergência ou precisa de mais detalhes para prosseguir.

O que aconteceu: [Inserir detalhe, ex: o valor da nota não coincide com o valor digitado / falta o CNPJ do estabelecimento].

Por favor, acesse o sistema para responder à contestação ou anexar a documentação complementar. Assim que você atualizar, faremos uma nova análise prioritária.

Qualquer dúvida, estou à disposição!`;
    default:
      return "";
  }
}

export function buildMailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
