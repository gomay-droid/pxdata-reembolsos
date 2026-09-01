-- AlterTable
ALTER TABLE "Reimbursement" ADD COLUMN "pixKey" TEXT NOT NULL DEFAULT 'não informado';

-- Motivo da despesa: preenche registros antigos sem texto
UPDATE "Expense" SET "observation" = 'não informado' WHERE "observation" IS NULL OR TRIM("observation") = '';
