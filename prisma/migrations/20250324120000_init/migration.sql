-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requesterName" TEXT NOT NULL,
    "requesterAddress" TEXT,
    "requesterDocument" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enviado',
    "totalAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reimbursementId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "expenseLine" TEXT NOT NULL,
    "accountCode" TEXT,
    "amount" REAL NOT NULL,
    CONSTRAINT "Expense_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "Reimbursement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "reimbursementId" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    CONSTRAINT "Attachment_reimbursementId_fkey" FOREIGN KEY ("reimbursementId") REFERENCES "Reimbursement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
