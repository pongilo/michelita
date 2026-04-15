import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const getOrdersOverviewSchema = z.object({
  organizationId: z.uuid(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
});

export type GetOrdersOverviewProps = z.infer<typeof getOrdersOverviewSchema>;

const getOrdersOverviewServerFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => getOrdersOverviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { organizationId, startAt, endAt } = data;

    const orders = await prisma.order.findMany({
      where: {
        organizationId,
        orderedAt: { gte: startAt, lt: endAt },
      },
      orderBy: { orderedAt: "asc" },
      select: {
        id: true,
        isPaid: true,
        shippingFee: true,
        discount: true,
        orderedAt: true,
        customer: { select: { name: true } },
        item: { select: { description: true, quantity: true, total: true, isDelivered: true } },
      },
    });

    const orderCount = orders.length;

    let totalRevenue = 0;
    for (const order of orders) {
      const itemTotal = order.item.reduce((sum, i) => sum + Number(i.total), 0);
      const shipping = Number(order.shippingFee ?? 0);
      const discount = Number(order.discount ?? 0);
      totalRevenue += itemTotal + shipping - discount;
    }

    const averageTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      orders: orders.map((order) => ({
        ...order,
        shippingFee: order.shippingFee !== null ? Number(order.shippingFee) : null,
        discount: order.discount !== null ? Number(order.discount) : null,
        item: order.item.map((i) => ({ ...i, total: Number(i.total) })),
        orderedAt: order.orderedAt.toISOString(),
      })),
      stats: {
        orderCount,
        totalRevenue,
        averageTicket,
      },
    };
  });

export async function getOrdersOverview(data: GetOrdersOverviewProps) {
  return getOrdersOverviewServerFn({ data });
}
