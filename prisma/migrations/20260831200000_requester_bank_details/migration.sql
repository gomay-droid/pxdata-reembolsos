-- AlterTable
ALTER TABLE "Reimbursement" ADD COLUMN "bankName" TEXT NOT NULL DEFAULT 'não informado';
ALTER TABLE "Reimbursement" ADD COLUMN "bankAgency" TEXT NOT NULL DEFAULT 'não informado';
ALTER TABLE "Reimbursement" ADD COLUMN "bankAccount" TEXT NOT NULL DEFAULT 'não informado';
ALTER TABLE "Reimbursement" ADD COLUMN "bankAccountType" TEXT NOT NULL DEFAULT 'não informado';
ALTER TABLE "Reimbursement" ADD COLUMN "bankAccountHolder" TEXT NOT NULL DEFAULT 'não informado';
