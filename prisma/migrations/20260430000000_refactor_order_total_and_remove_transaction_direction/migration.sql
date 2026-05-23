-- AlterTable: add total column to order
ALTER TABLE "order" ADD COLUMN "total" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable: remove direction column from transaction
ALTER TABLE "transaction" DROP COLUMN "direction";

-- DropEnum
DROP TYPE "TransactionDirection";
