import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";

export type FinanceMailAttachment = {
  originalName: string;
  storedPath: string;
  mimeType: string;
};

export type SendFinancePackInput = {
  to: string;
  reimbursementId: string;
  requesterName: string;
  requesterEmail: string;
  totalAmount: number;
  spreadsheetFilename: string;
  spreadsheetBuffer: Buffer;
  receipts: FinanceMailAttachment[];
  rootDir: string;
  publicBaseUrl: string;
};

/** Resend: 40 MB após base64. ~4/3 do binário + folga para HTML/cabeçalhos. */
const MAX_RAW_BYTES = 28 * 1024 * 1024;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function assertMailConfigured(): void {
  if (!process.env.RESEND_API_KEY?.trim()) {
    throw new Error("Envio de e-mail não configurado. Defina RESEND_API_KEY no servidor.");
  }
  if (!process.env.RESEND_FROM?.trim()) {
    throw new Error(
      "Defina RESEND_FROM (remetente do domínio verificado no Resend, ex.: Reembolsos PX <reembolsos@pxdata.ai>)."
    );
  }
}

function safeFilename(name: string, fallback: string): string {
  const base = path
    .basename(name)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .trim();
  return base || fallback;
}

function publicFileUrl(publicBaseUrl: string, storedPath: string): string {
  const rel = storedPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const base = publicBaseUrl.replace(/\/$/, "");
  return `${base}/${rel}`;
}

type PackedAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

function packAttachments(
  input: SendFinancePackInput
): { attached: PackedAttachment[]; linked: { name: string; url: string }[] } {
  const attached: PackedAttachment[] = [
    {
      filename: input.spreadsheetFilename,
      content: input.spreadsheetBuffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  ];
  let used = input.spreadsheetBuffer.length;
  const linked: { name: string; url: string }[] = [];

  const loaded = input.receipts.map((receipt, index) => {
    const abs = path.join(input.rootDir, receipt.storedPath);
    const filename = safeFilename(receipt.originalName, `comprovante-${index + 1}`);
    if (!fs.existsSync(abs)) {
      console.warn("[finance-email] anexo ausente no disco:", abs);
      return null;
    }
    const content = fs.readFileSync(abs);
    return {
      filename,
      content,
      contentType: receipt.mimeType || undefined,
      url: publicFileUrl(input.publicBaseUrl, receipt.storedPath),
    };
  });

  const available = loaded
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.content.length - b.content.length);

  for (const item of available) {
    if (used + item.content.length <= MAX_RAW_BYTES) {
      attached.push({
        filename: item.filename,
        content: item.content,
        contentType: item.contentType,
      });
      used += item.content.length;
    } else {
      linked.push({ name: item.filename, url: item.url });
    }
  }

  return { attached, linked };
}

export async function sendFinanceReimbursementEmail(input: SendFinancePackInput): Promise<void> {
  assertMailConfigured();
  const to = input.to.trim().toLowerCase();
  if (!to) {
    throw new Error("Nenhum destinatário do financeiro configurado (FINANCE_EMAIL).");
  }

  const { attached, linked } = packAttachments(input);
  const total = input.totalAmount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const linkedHtml =
    linked.length === 0
      ? ""
      : `<p>Alguns comprovantes excederam o limite de anexo do e-mail e estão nos links:</p>
<ul>${linked
          .map(
            (item) =>
              `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a></li>`
          )
          .join("")}</ul>`;

  const linkedText =
    linked.length === 0
      ? ""
      : `\nComprovantes via link (acima do limite de anexo):\n${linked
          .map((item) => `- ${item.name}: ${item.url}`)
          .join("\n")}\n`;

  const resend = new Resend(process.env.RESEND_API_KEY!.trim());
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM!.trim(),
    to: [to],
    subject: `Reembolso ${input.reimbursementId} — ${input.requesterName}`,
    text: [
      `Solicitação ${input.reimbursementId}`,
      `Solicitante: ${input.requesterName} <${input.requesterEmail}>`,
      `Total: ${total}`,
      "",
      "Seguem a planilha de nota de débito e os comprovantes anexados pelo colaborador.",
      linkedText,
    ].join("\n"),
    html: `<p>Solicitação <strong>${escapeHtml(input.reimbursementId)}</strong></p>
<p>Solicitante: ${escapeHtml(input.requesterName)} &lt;${escapeHtml(input.requesterEmail)}&gt;<br/>Total: ${escapeHtml(total)}</p>
<p>Seguem a planilha de nota de débito e os comprovantes anexados pelo colaborador.</p>
${linkedHtml}`,
    attachments: attached.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  if (error) {
    throw new Error(error.message || "Falha ao enviar e-mail pelo Resend");
  }
}
