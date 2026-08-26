-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "odometerStart" REAL;
ALTER TABLE "Expense" ADD COLUMN "odometerEnd" REAL;
ALTER TABLE "Expense" ADD COLUMN "litersFilled" REAL;

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN "fuelMinKmPerLiter" REAL NOT NULL DEFAULT 8;
ALTER TABLE "CompanySettings" ADD COLUMN "fuelMaxKmPerLiter" REAL NOT NULL DEFAULT 18;
