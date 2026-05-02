/*
  Warnings:

  - You are about to drop the `order_transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_transaction" DROP CONSTRAINT "order_transaction_order_id_fkey";

-- DropForeignKey
ALTER TABLE "order_transaction" DROP CONSTRAINT "order_transaction_transaction_id_fkey";

-- DropTable
DROP TABLE "order_transaction";
