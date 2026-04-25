-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "direction" "TransactionDirection" NOT NULL DEFAULT 'INCOME';
