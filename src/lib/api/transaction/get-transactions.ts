import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getTransactionsSchema = z.object({
  organizationId: z.uuid(),
});

export type GetTransactionsProps = z.infer<typeof getTransactionsSchema>;

const transactionMethodFromPrisma = {
  PIX: "pix",
  CASH: "cash",
  CREDIT_CARD: "credit_card",
  DEBIT_CARD: "debit_card",
} as const;

const getTransactionsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getTransactionsSchema.parse(input))
  .handler(async ({ data }) => {
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: data.organizationId,
      },
      orderBy: {
        madeAt: "desc",
      },
      select: {
        id: true,
        amount: true,
        method: true,
        madeAt: true,
        description: true,
        customer: {
          select: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return transactions.map((transaction) => {
      const linkedCustomers = Array.from(
        new Map(
          transaction.customer.map((customerLink) => [
            customerLink.customer.id,
            customerLink.customer,
          ]),
        ).values(),
      );

      return {
        id: transaction.id,
        linkedCustomerId: linkedCustomers[0]?.id ?? null,
        linkedCustomers,
        amount: Number(transaction.amount),
        type: Number(transaction.amount) >= 0 ? "entry" : "exit",
        method: transactionMethodFromPrisma[transaction.method],
        madeAt: transaction.madeAt,
        description: transaction.description,
      };
    });
  });

export async function getTransactions(data: GetTransactionsProps) {
  return getTransactionsServerFn({
    data,
  });
}
