import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const listOrdersSchema = z.object({
  organizationId: z.uuid(),
  startDate: z.string(),
  endDate: z.string(),
});

export type ListOrdersProps = z.infer<typeof listOrdersSchema>;

const listOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => listOrdersSchema.parse(input))
  .handler(async ({ data }) => {
    const start = new Date(`${data.startDate}T00:00:00Z`);
    const end = new Date(`${data.endDate}T00:00:00Z`);

    const items = await prisma.orderItem.findMany({
      where: {
        deliveredAt: { gte: start, lt: end },
        order: { organizationId: data.organizationId },
      },
      orderBy: { deliveredAt: "asc" },
      select: {
        id: true,
        description: true,
        unit_price: true,
        quantity: true,
        deliveredAt: true,
        note: true,
        isDelivered: true,
        order: {
          select: {
            id: true,
            orderedAt: true,
            note: true,
            customer: true,
            isPaid: true,
            shippingFee: true,
            discount: true,
            total: true,
          },
        },
      },
    });

    type RawItem = typeof items[0];
    type OrderGroupItem = Pick<RawItem, "id" | "description" | "quantity" | "note" | "isDelivered"> & { total: number };
    type OrderGroup = {
      key: string;
      deliveredAt: string;
      order: Omit<RawItem["order"], "shippingFee" | "discount" | "total"> & { shippingFee: number | null; discount: number | null; total: number };
      items: OrderGroupItem[];
    };

    const dayMap = new Map<string, Map<string, OrderGroup>>();
    for (const item of items) {
      const dayKey = item.deliveredAt.toISOString().slice(0, 10);
      const groupMap = dayMap.get(dayKey) ?? new Map<string, OrderGroup>();
      dayMap.set(dayKey, groupMap);

      const key = `${item.order.id}_${item.deliveredAt?.toISOString() ?? "sem-data"}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          deliveredAt: item.deliveredAt?.toISOString() ?? "",
          order: {
            ...item.order,
            shippingFee: item.order.shippingFee !== null ? Number(item.order.shippingFee) : null,
            discount: item.order.discount !== null ? Number(item.order.discount) : null,
            total: Number(item.order.total),
          },
          items: [],
        });
      }
      groupMap.get(key)!.items.push({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        total: Number((Number(item.unit_price) * item.quantity).toFixed(2)),
        note: item.note,
        isDelivered: item.isDelivered,
      });
    }

    const days = Array.from(dayMap.entries()).map(([date, groupMap]) => ({
      date,
      groups: Array.from(groupMap.values()),
    }));

    return { days };
  });

export async function listOrders(data: ListOrdersProps) {
  return listOrdersServerFn({ data });
}
