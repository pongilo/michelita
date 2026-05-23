/*
  Warnings:

  - You are about to drop the `customer_transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `order_transaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "customer_transaction" DROP CONSTRAINT "customer_transaction_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "customer_transaction" DROP CONSTRAINT "customer_transaction_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "order_transaction" DROP CONSTRAINT "order_transaction_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_transaction" DROP CONSTRAINT "order_transaction_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_organization_id_fkey";

-- DropTable
DROP TABLE "customer_transaction";

-- DropTable
DROP TABLE "order_transaction";

-- DropTable
DROP TABLE "transaction";

-- DropEnum
DROP TYPE "transaction_method";
