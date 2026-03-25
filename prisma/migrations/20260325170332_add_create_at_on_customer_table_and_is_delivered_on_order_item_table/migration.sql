-- AlterTable
ALTER TABLE "customer" ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "order_item" ADD COLUMN     "is_delivered" BOOLEAN NOT NULL DEFAULT false;
