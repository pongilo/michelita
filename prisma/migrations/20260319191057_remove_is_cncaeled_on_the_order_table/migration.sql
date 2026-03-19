/*
  Warnings:

  - You are about to drop the column `is_canceled` on the `order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "order" DROP COLUMN "is_canceled";
