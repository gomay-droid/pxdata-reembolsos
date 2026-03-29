import type { Prisma } from "@prisma/client";

/** Include reutilizado em `findUnique` e no tipo inferido abaixo. */
export const adminReimbursementDetailInclude = {
  expenses: true,
  attachments: true,
} satisfies Prisma.ReimbursementInclude;

export type ReimbursementAdminDetailRow = Prisma.ReimbursementGetPayload<{
  include: typeof adminReimbursementDetailInclude;
}>;

export type AdminExpenseAttachmentJson = {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type AdminExpenseRowJson = {
  id: number;
  description: string;
  expenseLine: string;
  accountCode: string | null;
  amount: number;
  attachments: AdminExpenseAttachmentJson[];
};

/**
 * Monta as despesas para o GET admin com anexos por `expenseId`.
 * Comprovantes sem `expenseId` (legado) são distribuídos às despesas sem arquivo,
 * em ordem de id; excedentes vão para o último item.
 */
export function buildAdminExpenseRowsForJson(
  r: ReimbursementAdminDetailRow
): AdminExpenseRowJson[] {
  type Att = ReimbursementAdminDetailRow["attachments"][number];

  const toJson = (a: Att): AdminExpenseAttachmentJson => ({
    id: a.id,
    originalName: a.originalName,
    mimeType: a.mimeType,
    size: a.size,
    url: `/${a.storedPath}`,
  });

  const expensesSorted = [...r.expenses].sort((a, b) => a.id - b.id);
  const linkedByExpenseId = new Map<number, Att[]>();
  const orphans: Att[] = [];

  for (const a of r.attachments) {
    if (a.expenseId == null) {
      orphans.push(a);
    } else {
      const list = linkedByExpenseId.get(a.expenseId) ?? [];
      list.push(a);
      linkedByExpenseId.set(a.expenseId, list);
    }
  }
  orphans.sort((a, b) => a.id - b.id);

  const rows: AdminExpenseRowJson[] = expensesSorted.map((e) => ({
    id: e.id,
    description: e.description,
    expenseLine: e.expenseLine,
    accountCode: e.accountCode,
    amount: e.amount,
    attachments: (linkedByExpenseId.get(e.id) ?? []).map(toJson),
  }));

  let oi = 0;
  for (const row of rows) {
    if (row.attachments.length === 0 && oi < orphans.length) {
      row.attachments.push(toJson(orphans[oi++]));
    }
  }
  while (oi < orphans.length && rows.length > 0) {
    rows[rows.length - 1].attachments.push(toJson(orphans[oi++]));
  }

  return rows;
}
