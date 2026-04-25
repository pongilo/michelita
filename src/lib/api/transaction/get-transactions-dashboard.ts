import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  organizationId: z.uuid(),
  startAt: z.string(),
  endAt: z.string(),
});

export type GetTransactionsDashboardProps = z.infer<typeof schema>;

const getTransactionsDashboardServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const transactions = await prisma.transaction.findMany({
      where: {
        organizationId: data.organizationId,
        date: { gte: new Date(data.startAt), lt: new Date(data.endAt) },
      },
      select: {
        amount: true,
        category: { select: { id: true, name: true } },
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = new Map<
      string,
      { id: string | null; name: string; income: number; expense: number }
    >();

    for (const t of transactions) {
      const amount = Number(t.amount);
      const key = t.category?.id ?? "__none__";

      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          id: t.category?.id ?? null,
          name: t.category?.name ?? "Sem categoria",
          income: 0,
          expense: 0,
        });
      }

      const cat = categoryMap.get(key)!;

      if (amount >= 0) {
        totalIncome += amount;
        cat.income += amount;
      } else {
        totalExpense += Math.abs(amount);
        cat.expense += Math.abs(amount);
      }
    }

    const categories = Array.from(categoryMap.values())
      .map((cat) => ({
        ...cat,
        percentOfIncome: totalIncome > 0 ? (cat.income / totalIncome) * 100 : 0,
        percentOfExpense: totalExpense > 0 ? (cat.expense / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.expense - a.expense || b.income - a.income);

    return {
      income: totalIncome,
      expense: totalExpense,
      balance: totalIncome - totalExpense,
      spentPercent: totalIncome > 0 ? (totalExpense / totalIncome) * 100 : null,
      categories,
    };
  });

export async function getTransactionsDashboard(props: GetTransactionsDashboardProps) {
  return getTransactionsDashboardServerFn({ data: props });
}
