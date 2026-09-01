import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { resolveExpenseAccountCode } from "../src/lib/expenseCatalog.ts";
import { formatBankDetailsLine } from "../src/lib/bankDetails.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "templates", "reembolso-nota-debito.xlsx");
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
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankAccountType: string;
  bankAccountHolder: string;
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

function xmlText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cellOpenRe(ref: string): RegExp {
  return new RegExp(`<c r="${ref}"([^>/]*)`);
}

function cellFullRe(ref: string): RegExp {
  return new RegExp(`<c r="${ref}"[^/]*/>|<c r="${ref}"[^>]*>[\\s\\S]*?</c>`);
}

function styleAttr(style: string | undefined): string {
  return style ? ` s="${style}"` : "";
}

function readStyle(sheetXml: string, ref: string): string | undefined {
  const m = sheetXml.match(cellOpenRe(ref));
  return m?.[1].match(/\ss="(\d+)"/)?.[1];
}

function textCellXml(ref: string, style: string | undefined, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return `<c r="${ref}"${styleAttr(style)}/>`;
  return `<c r="${ref}"${styleAttr(style)} t="inlineStr"><is><t xml:space="preserve">${xmlText(value)}</t></is></c>`;
}

function numberCellXml(ref: string, style: string | undefined, value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return `<c r="${ref}"${styleAttr(style)}/>`;
  }
  return `<c r="${ref}"${styleAttr(style)}><v>${value}</v></c>`;
}

function accountCellXml(ref: string, style: string | undefined, code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits && Number.isSafeInteger(Number(digits))) {
    return numberCellXml(ref, style, Number(digits));
  }
  return textCellXml(ref, style, code);
}

function replaceCell(sheetXml: string, ref: string, nextXml: string): string {
  const re = cellFullRe(ref);
  if (!re.test(sheetXml)) return sheetXml;
  return sheetXml.replace(cellFullRe(ref), nextXml);
}

function setText(sheetXml: string, ref: string, value: string): string {
  return replaceCell(sheetXml, ref, textCellXml(ref, readStyle(sheetXml, ref), value));
}

function setNumber(sheetXml: string, ref: string, value: number | null): string {
  return replaceCell(sheetXml, ref, numberCellXml(ref, readStyle(sheetXml, ref), value));
}

/** Remove partes do Google Planilhas que o Excel trata como conteúdo ilegível. */
async function stripGoogleSheetsArtifacts(zip: JSZip): Promise<void> {
  zip.remove("xl/metadata");

  const relsFile = zip.file("xl/_rels/workbook.xml.rels");
  if (relsFile) {
    const rels = (await relsFile.async("string")).replace(
      /<Relationship[^>]*customschemas\.google\.com[^>]*\/>/g,
      ""
    );
    zip.file("xl/_rels/workbook.xml.rels", rels);
  }

  const workbookFile = zip.file("xl/workbook.xml");
  if (workbookFile) {
    const workbook = (await workbookFile.async("string")).replace(
      /<extLst>[\s\S]*?<\/extLst>/g,
      ""
    );
    zip.file("xl/workbook.xml", workbook);
  }

  const typesFile = zip.file("[Content_Types].xml");
  if (typesFile) {
    const types = (await typesFile.async("string")).replace(
      /<Override[^>]*PartName="\/xl\/metadata"[^>]*\/>/g,
      ""
    );
    zip.file("[Content_Types].xml", types);
  }
}

/**
 * Gera .xlsx no layout da planilha PX (Nota Débito).
 * Preenche o template via ZIP/XML (sem regravar o pacote com ExcelJS).
 * O template veio do Google Planilhas: fórmulas XLOOKUP em array e metadados
 * extras fazem o Excel pedir reparo — a coluna E é gravada como valor (código CCS)
 * e os artefatos Google são removidos.
 */
export async function buildReimbursementSpreadsheetBuffer(
  input: ReimbursementSpreadsheetInput
): Promise<Buffer> {
  if (input.expenses.length === 0) {
    throw new Error("O reembolso não possui despesas para exportar");
  }
  if (input.expenses.length > MAX_EXPENSE_ROWS) {
    throw new Error(`A planilha suporta até ${MAX_EXPENSE_ROWS} despesas por reembolso`);
  }

  const zip = await JSZip.loadAsync(fs.readFileSync(TEMPLATE_PATH));
  await stripGoogleSheetsArtifacts(zip);

  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  if (!sheetFile) {
    throw new Error("Aba principal não encontrada no template");
  }

  let sheet = await sheetFile.async("string");

  sheet = setText(sheet, "C8", input.requesterName);
  sheet = setText(sheet, "C9", input.requesterAddress ?? "");
  sheet = setText(sheet, "C10", input.requesterDocument);
  sheet = setText(sheet, "C11", input.requesterEmail);
  sheet = setText(sheet, "B12", "DADOS BANCÁRIOS");
  sheet = setText(
    sheet,
    "C12",
    formatBankDetailsLine({
      bankName: input.bankName,
      bankAgency: input.bankAgency,
      bankAccount: input.bankAccount,
      bankAccountType: input.bankAccountType,
      bankAccountHolder: input.bankAccountHolder,
    })
  );

  sheet = setText(sheet, "C13", input.company.name);
  sheet = setText(sheet, "C14", input.company.address);
  sheet = setText(sheet, "C15", input.company.cnpj);
  sheet = setText(sheet, "C16", input.company.email);

  sheet = setText(sheet, "F3", input.reimbursementId);
  sheet = setText(sheet, "F4", formatDateBR(input.createdAt));
  sheet = setText(sheet, "F5", formatReferenceMonth(input.createdAt));

  for (let row = FIRST_EXPENSE_ROW; row <= LAST_EXPENSE_ROW; row++) {
    const expense = input.expenses[row - FIRST_EXPENSE_ROW];
    if (expense) {
      const amount = Number.isFinite(expense.amount) ? expense.amount : null;
      const accountCode = resolveExpenseAccountCode(expense.expenseLine, expense.accountCode);
      sheet = setText(sheet, `B${row}`, `DESPESA ${row - FIRST_EXPENSE_ROW + 1}`);
      sheet = setText(sheet, `C${row}`, expense.description);
      sheet = setText(sheet, `D${row}`, expense.expenseLine);
      sheet = replaceCell(
        sheet,
        `E${row}`,
        accountCellXml(`E${row}`, readStyle(sheet, `E${row}`), accountCode)
      );
      sheet = setNumber(sheet, `F${row}`, amount);
    } else {
      sheet = setText(sheet, `B${row}`, "");
      sheet = setText(sheet, `C${row}`, "");
      sheet = setText(sheet, `D${row}`, "");
      sheet = replaceCell(
        sheet,
        `E${row}`,
        accountCellXml(`E${row}`, readStyle(sheet, `E${row}`), "")
      );
      sheet = setNumber(sheet, `F${row}`, null);
    }
  }

  zip.file("xl/worksheets/sheet1.xml", sheet);

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    platform: "DOS",
    streamFiles: false,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

export function reimbursementSpreadsheetFilename(reimbursementId: string): string {
  const safeId = reimbursementId.replace(/[^a-zA-Z0-9-]/g, "");
  return `nota-debito-${safeId}.xlsx`;
}
