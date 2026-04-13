import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const overviewPeriodSchema = z.enum(["daily", "weekly", "monthly"]);

const getOrdersOverviewSchema = z.object({
  organizationId: z.uuid(),
  period: overviewPeriodSchema.default("monthly"),
  referenceDate: z.string().optional(),
});

export type GetOrdersOverviewProps = z.infer<typeof getOrdersOverviewSchema>;
type OverviewPeriod = z.infer<typeof overviewPeriodSchema>;

function getPeriodBounds(period: OverviewPeriod, baseDate = new Date()) {
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

  // monthly
  start.setDate(1);
  end.setTime(start.getTime());
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function parseReferenceDate(value: string | undefined) {
  if (!value) return new Date();
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Data de referência inválida.");
  return parsed;
}

const getOrdersOverviewServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => getOrdersOverviewSchema.parse(input))
  .handler(async ({ data }) => {
    const referenceDate = parseReferenceDate(data.referenceDate);
    const { start, end } = getPeriodBounds(data.period, referenceDate);

    const rangeEndDate = new Date(end);
    rangeEndDate.setDate(rangeEndDate.getDate() - 1);
    rangeEndDate.setHours(0, 0, 0, 0);

    const ordersInPeriod = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
        orderedAt: { gte: start, lt: end },
      },
      select: {
        shippingFee: true,
        discount: true,
        item: { select: { total: true } },
      },
    });

    const orderCount = ordersInPeriod.length;
    let totalRevenue = 0;
    for (const order of ordersInPeriod) {
      const itemTotal = order.item.reduce((sum, i) => sum + Number(i.total), 0);
      const shipping = Number(order.shippingFee ?? 0);
      const discount = Number(order.discount ?? 0);
      totalRevenue += itemTotal + shipping - discount;
    }
    const averageTicket = orderCount > 0 ? totalRevenue / orderCount : 0;

    const pendingOrders = await prisma.order.findMany({
      where: {
        organizationId: data.organizationId,
        OR: [
          { isPaid: false },
          { item: { some: { isDelivered: false } } },
        ],
      },
      orderBy: { orderedAt: "desc" },
      select: {
        id: true,
        isPaid: true,
        orderedAt: true,
        shippingFee: true,
        discount: true,
        customer: { select: { id: true, name: true } },
        item: { select: { total: true, isDelivered: true, description: true, quantity: true } },
      },
    });

    return {
      period: data.period,
      rangeStart: start.toISOString(),
      rangeEnd: rangeEndDate.toISOString(),
      stats: {
        totalRevenue,
        orderCount,
        averageTicket,
      },
      pendingOrders: pendingOrders.map((order) => {
        const itemTotal = order.item.reduce((sum, i) => sum + Number(i.total), 0);
        const shipping = Number(order.shippingFee ?? 0);
        const discount = Number(order.discount ?? 0);
        const total = itemTotal + shipping - discount;
        const allItemsDelivered = order.item.every((i) => i.isDelivered);
        return {
          id: order.id,
          isPaid: order.isPaid,
          orderedAt: order.orderedAt.toISOString(),
          customer: order.customer,
          total,
          allItemsDelivered,
          itemCount: order.item.length,
          items: order.item.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            total: Number(i.total),
            isDelivered: i.isDelivered,
          })),
        };
      }),
    };
  });

export async function getOrdersOverview(data: GetOrdersOverviewProps) {
  return getOrdersOverviewServerFn({ data });
}
