/*
  Warnings:

  - You are about to drop the column `order_id` on the `transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_order_id_fkey";

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "order_id",
ADD COLUMN     "customer_id" UUID;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
