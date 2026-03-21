import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const transactionsPeriodSchema = z.enum(["daily", "weekly", "monthly"]);
type TransactionsPeriod = z.infer<typeof transactionsPeriodSchema>;

const getTransactionsSchema = z.object({
  organizationId: z.uuid(),
  period: transactionsPeriodSchema.default("monthly"),
  referenceDate: z.string().optional(),
});

function parseReferenceDate(value: string | undefined) {
  if (!value) return new Date();
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Data de referencia invalida.");
  return parsed;
}

function getPeriodBounds(period: TransactionsPeriod, baseDate: Date) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (period === "daily") {
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  if (period === "weekly") {
    const diffToMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - diffToMonday);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  start.setDate(1);
  end.setTime(start.getTime());
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

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
    const { start, end } = getPeriodBounds(data.period, parseReferenceDate(data.referenceDate));

    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: data.organizationId,
        madeAt: { gte: start, lt: end },
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
        orderTransactions: {
          select: {
            order: {
              select: {
                id: true,
                orderedAt: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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

      const linkedOrders = transaction.orderTransactions.map(({ order }) => ({
        id: order.id,
        orderedAt: order.orderedAt,
        customer: order.customer,
      }));

      return {
        id: transaction.id,
        linkedCustomerId: linkedCustomers[0]?.id ?? null,
        linkedCustomers,
        linkedOrderId: linkedOrders[0]?.id ?? null,
        linkedOrders,
        amount: Number(transaction.amount),
        type: Number(transaction.amount) >= 0 ? "entry" : "exit",
        method: transactionMethodFromPrisma[transaction.method],
        madeAt: transaction.madeAt,
        description: transaction.description,
      };
    });
  });

export type { TransactionsPeriod };

export async function getTransactions(data: GetTransactionsProps) {
  return getTransactionsServerFn({
    data,
  });
}
