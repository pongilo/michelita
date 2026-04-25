-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PIX', 'CREDIT', 'DEBIT', 'CASH');

-- CreateTable
CREATE TABLE "transaction_category" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "transaction_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "category_id" UUID,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_transaction" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,

    CONSTRAINT "order_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_transaction_transaction_id_key" ON "order_transaction"("transaction_id");

-- AddForeignKey
ALTER TABLE "transaction_category" ADD CONSTRAINT "transaction_category_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "transaction_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_transaction" ADD CONSTRAINT "order_transaction_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_transaction" ADD CONSTRAINT "order_transaction_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
