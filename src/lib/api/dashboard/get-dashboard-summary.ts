import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getDashboardSummarySchema = z.object({
  organizationId: z.uuid(),
  date: z.string(),
});

export type GetDashboardSummaryProps = z.infer<typeof getDashboardSummarySchema>;

const getDashboardSummaryServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getDashboardSummarySchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId, date } = data;

    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth() + 1, 1));

    const [ordersDeliveredToday, topProductsRaw, customersCount, productsCount, suppliesCount] =
      await Promise.all([
        prisma.order.count({
          where: { organizationId, item: { some: { deliveredAt: { gte: dayStart, lt: dayEnd } } } },
        }),
        prisma.orderItem.groupBy({
          by: ["description"],
          where: {
            order: { organizationId, orderedAt: { gte: monthStart, lt: monthEnd } },
          },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 3,
        }),
        prisma.customer.count({ where: { organizationId } }),
        prisma.product.count({ where: { organizationId } }),
        prisma.supply.count({ where: { organizationId } }),
      ]);

    return {
      ordersDeliveredToday,
      topProducts: topProductsRaw.map((item) => ({
        description: item.description,
        quantity: item._sum.quantity ?? 0,
      })),
      customersCount,
      productsCount,
      suppliesCount,
    };
  });

export async function getDashboardSummary(data: GetDashboardSummaryProps) {
  return getDashboardSummaryServerFn({ data });
}
