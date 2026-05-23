import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getTransactionsSchema = z.object({
  organizationId: z.uuid(),
  startAt: z.string(),
  endAt: z.string(),
});

export type GetTransactionsProps = z.infer<typeof getTransactionsSchema>;

const getTransactionsServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getTransactionsSchema.parse(input))
  .handler(async ({ data }) => {
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: data.organizationId,
        date: { gte: new Date(data.startAt), lt: new Date(data.endAt) },
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        date: true,
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      date: t.date.toISOString(),
    }));
  });

export async function getTransactions(props: GetTransactionsProps) {
  return getTransactionsServerFn({ data: props });
}
