-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_category_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_organization_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction_category" DROP CONSTRAINT "transaction_category_organization_id_fkey";

-- DropTable
DROP TABLE "transaction";

-- DropTable
DROP TABLE "transaction_category";

-- DropEnum
DROP TYPE "TransactionType";

