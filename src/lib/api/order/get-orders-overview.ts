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
        total: true,
        orderedAt: true,
        customer: { select: { name: true } },
        item: { select: { description: true, unit_price: true, quantity: true, isDelivered: true } },
      },
    });

    const orderCount = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const averageTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      orders: orders.map((order) => ({
        ...order,
        shippingFee: order.shippingFee !== null ? Number(order.shippingFee) : null,
        discount: order.discount !== null ? Number(order.discount) : null,
        total: Number(order.total),
        item: order.item.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          isDelivered: i.isDelivered,
          total: Number((Number(i.unit_price) * i.quantity).toFixed(2)),
        })),
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
