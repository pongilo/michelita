-- AlterTable
ALTER TABLE "order" ADD COLUMN     "is_paid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "note" TEXT;
