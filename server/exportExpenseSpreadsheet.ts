import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveExpenseAccountCode } from "../src/lib/expenseCatalog.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "templates", "reembolso-nota-debito.xlsx");
const SHEET_NAME = "NOTA DÉBITO MÊS.ANO";
const FIRST_EXPENSE_ROW = 19;
const LAST_EXPENSE_ROW = 33;
const MAX_EXPENSE_ROWS = LAST_EXPENSE_ROW - FIRST_EXPENSE_ROW + 1;

export type ExpenseSpreadsheetLine = {
  description: string;
  expenseLine: string;
  accountCode: string | null;
  amount: number;
};

export type ReimbursementSpreadsheetInput = {
  reimbursementId: string;
  createdAt: Date;
  requesterName: string;
  requesterAddress: string | null;
  requesterDocument: string;
  requesterEmail: string;
  company: {
    name: string;
    address: string;
    cnpj: string;
    email: string;
  };
  expenses: ExpenseSpreadsheetLine[];
};

function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatReferenceMonth(date: Date): string {
  const month = date
    .toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", month: "long" })
    .toUpperCase();
  const year = date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  });
  return `${month}/${year}`;
}

function clearCellValue(cell: ExcelJS.Cell) {
  cell.value = null;
}

/** Gera .xlsx no layout da planilha PX (Nota Débito) com todas as despesas do reembolso. */
export async function buildReimbursementSpreadsheetBuffer(
  input: ReimbursementSpreadsheetInput
): Promise<Buffer> {
  if (input.expenses.length === 0) {
    throw new Error("O reembolso não possui despesas para exportar");
  }
  if (input.expenses.length > MAX_EXPENSE_ROWS) {
    throw new Error(`A planilha suporta até ${MAX_EXPENSE_ROWS} despesas por reembolso`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    throw new Error(`Aba "${SHEET_NAME}" não encontrada no template`);
  }

  // Solicitante
  sheet.getCell("C8").value = input.requesterName;
  sheet.getCell("C9").value = input.requesterAddress ?? "";
  sheet.getCell("C10").value = input.requesterDocument;
  sheet.getCell("C11").value = input.requesterEmail;

  // PX — sempre lido do CompanySettings no momento da exportação
  sheet.getCell("C13").value = input.company.name;
  sheet.getCell("C14").value = input.company.address;
  sheet.getCell("C15").value = input.company.cnpj;
  sheet.getCell("C16").value = input.company.email;

  sheet.getCell("F3").value = input.reimbursementId;
  sheet.getCell("F4").value = formatDateBR(input.createdAt);
  sheet.getCell("F5").value = formatReferenceMonth(input.createdAt);

  for (let row = FIRST_EXPENSE_ROW; row <= LAST_EXPENSE_ROW; row++) {
    clearCellValue(sheet.getCell(`C${row}`));
    clearCellValue(sheet.getCell(`D${row}`));
    clearCellValue(sheet.getCell(`E${row}`));
    clearCellValue(sheet.getCell(`F${row}`));
  }

  let total = 0;
  input.expenses.forEach((expense, index) => {
    const row = FIRST_EXPENSE_ROW + index;
    const accountCode = resolveExpenseAccountCode(expense.expenseLine, expense.accountCode);
    const accountNumeric = accountCode ? Number(accountCode) : null;

    sheet.getCell(`B${row}`).value = `DESPESA ${index + 1}`;
    sheet.getCell(`C${row}`).value = expense.description;
    sheet.getCell(`D${row}`).value = expense.expenseLine;
    sheet.getCell(`E${row}`).value = accountNumeric ?? accountCode;
    sheet.getCell(`F${row}`).value = expense.amount;
    total += expense.amount;
  });

  sheet.getCell("B34").value = "TOTAL";
  sheet.getCell("F34").value = total;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function reimbursementSpreadsheetFilename(reimbursementId: string): string {
  const safeId = reimbursementId.replace(/[^a-zA-Z0-9-]/g, "");
  return `nota-debito-${safeId}.xlsx`;
}
