-- Data da despesa (independente da data de envio do reembolso)
ALTER TABLE "Expense" ADD COLUMN "expenseDate" DATETIME;

UPDATE "Expense"
SET "expenseDate" = (
  SELECT "createdAt" FROM "Reimbursement"
  WHERE "Reimbursement"."id" = "Expense"."reimbursementId"
)
WHERE "expenseDate" IS NULL;
