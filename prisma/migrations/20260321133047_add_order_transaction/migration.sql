/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `customer` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "order_transaction" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,

    CONSTRAINT "order_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_phone_key" ON "customer"("phone");

-- AddForeignKey
ALTER TABLE "order_transaction" ADD CONSTRAINT "order_transaction_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_transaction" ADD CONSTRAINT "order_transaction_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
