-- CreateTable
CREATE TABLE "customer_transaction" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "transaction_id" UUID NOT NULL,

    CONSTRAINT "customer_transaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "customer_transaction" ADD CONSTRAINT "customer_transaction_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_transaction" ADD CONSTRAINT "customer_transaction_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
