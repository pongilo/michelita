/*
  Warnings:

  - You are about to drop the column `customer_id` on the `transaction` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_customer_id_fkey";

-- AlterTable
ALTER TABLE "transaction" DROP COLUMN "customer_id";
